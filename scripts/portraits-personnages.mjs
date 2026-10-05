// Un portrait pour les personnages sans photo (lancé le 01/10/2026).
//
// 200 à 300 personnages par jour, pas plus : Pixabay interdit les
// téléchargements en masse. Déroulé d'un lot, dans un dossier de travail :
//
//   node scripts/portraits-personnages.mjs reste
//   node scripts/portraits-personnages.mjs lot 250 50 <dossier>
//       → <dossier>/part-1.json … (50 personnages par part)
//   un sous-agent par part (consignes : scripts/portraits-consignes.md,
//       étape 1) écrit requetes-N.json
//   node scripts/portraits-personnages.mjs chercher <dossier> <N>
//       → candidats-N.json, feuilles-N-*.jpg (6 personnages par feuille)
//       UNE PART À LA FOIS, jamais en parallèle : la banque refuse sinon
//       une vignette sur deux
//   un sous-agent par part (étape 3) regarde les feuilles, écrit choix-N.json
//   node scripts/portraits-personnages.mjs poser <dossier> <N>
//       → copie le portrait retenu sur le site, marque photo_proposee,
//         note le suivi (table portraits_suivi, migration 0121)
//   node scripts/portraits-personnages.mjs fiche <dossier>
//       → ~/exports : la fiche des « moyens » et des « sans portrait »
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const AGENT = { "User-Agent": "WeFilmGood/1.0 (https://app.wefilmgood.com)" };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const lire = (f) => JSON.parse(readFileSync(f, "utf8"));

// Toutes les lignes d'une lecture (l'API en rend 1 000 au plus à la fois).
async function tout(table, colonnes, filtre = (q) => q) {
  const lignes = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await filtre(supabase.from(table).select(colonnes)).range(de, de + 999);
    if (error) throw new Error(error.message);
    lignes.push(...data);
    if (data.length < 1000) return lignes;
  }
}

async function aTraiter() {
  const deja = new Set((await tout("portraits_suivi", "character_id")).map((l) => l.character_id));
  const persos = await tout(
    "characters",
    "id, name, gender, age_range, character_type, biography, project:projects!inner(id, title, genre_slug, is_public)",
    (q) => q.is("photo_path", null).order("id"),
  );
  return persos.filter((p) => !deja.has(p.id));
}

const MOTS = {
  homme: { enfant: "boy", adolescent: "teenage boy", adulte: "man", senior: "old man" },
  femme: { enfant: "girl", adolescent: "teenage girl", adulte: "woman", senior: "old woman" },
};
const generique = (p) => `${MOTS[p.gender]?.[p.age_range] ?? MOTS[p.gender]?.adulte ?? "person"} portrait face`;

async function pixabay(q, pris) {
  const adresse =
    `https://pixabay.com/api/?key=${env.PIXABAY_API_KEY}&q=${encodeURIComponent(q.slice(0, 100))}` +
    `&lang=en&image_type=photo&category=people&per_page=40&safesearch=true`;
  const r = await fetch(adresse);
  if (r.status === 429) throw new Error("Pixabay : limite atteinte, réessayer plus tard");
  if (!r.ok) return [];
  const d = await r.json();
  return (d.hits ?? [])
    .filter((h) => !pris.has(String(h.id)))
    .map((h) => ({ apercu: h.webformatURL, url: h.largeImageURL, source: "pixabay", source_id: String(h.id), page: h.pageURL }));
}

async function wikipedia(nom) {
  const c = [];
  for (const lg of ["fr", "en"]) {
    const adresse =
      `https://${lg}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(nom)}` +
      `&gsrlimit=4&prop=pageimages&piprop=thumbnail&pithumbsize=600&format=json`;
    const r = await fetch(adresse, { headers: AGENT });
    if (!r.ok) continue;
    const d = await r.json();
    for (const p of Object.values(d.query?.pages ?? {})) {
      if (p.thumbnail) c.push({ apercu: p.thumbnail.source, url: p.thumbnail.source, source: "wikipedia", source_id: `${lg}:${p.title}`, page: p.title });
    }
  }
  return c;
}

// Une vignette de la banque, avec trois essais : en allant trop vite (cinq
// parts à la fois, le 01/10), près d'une vignette sur deux était refusée.
async function vignette(adresse) {
  for (let essai = 0; ; essai++) {
    const r = await fetch(adresse, { headers: AGENT });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    if (essai === 2) throw new Error(`vignette ${r.status}`);
    await pause(3000 * (essai + 1));
  }
}

const etiquette = (texte, largeur, hauteur, taille, fond, couleur) =>
  Buffer.from(
    `<svg width="${largeur}" height="${hauteur}"><rect width="${largeur}" height="${hauteur}" fill="${fond}"/>` +
      `<text x="5" y="${Math.round(hauteur * 0.75)}" font-size="${taille}" fill="${couleur}" font-family="sans-serif">${texte}</text></svg>`,
  );

const [commande, ...args] = process.argv.slice(2);

if (commande === "reste") {
  const reste = await aTraiter();
  console.log(`${reste.length} personnages sans portrait à traiter.`);
} else if (commande === "lot") {
  const [combien, parPart, dossier] = [Number(args[0]), Number(args[1]), args[2]];
  mkdirSync(dossier, { recursive: true });
  // Les projets visibles des membres d'abord, et les personnages décrits avant les autres.
  const reste = (await aTraiter()).sort(
    (a, b) =>
      Number(b.project.is_public) - Number(a.project.is_public) ||
      Number((b.biography ?? "").length > 80) - Number((a.biography ?? "").length > 80),
  );
  const lot = reste.slice(0, combien).map((p, k) => ({
    k,
    id: p.id,
    project_id: p.project.id,
    nom: p.name,
    genre: p.gender,
    age: p.age_range,
    role: p.character_type,
    projet: p.project.title,
    genre_du_film: p.project.genre_slug,
    description: (p.biography ?? "").replace(/\s+/g, " ").slice(0, 700),
  }));
  for (let n = 0; n * parPart < lot.length; n++) {
    writeFileSync(join(dossier, `part-${n + 1}.json`), JSON.stringify(lot.slice(n * parPart, (n + 1) * parPart), null, 1));
  }
  console.log(`${lot.length} personnages, ${Math.ceil(lot.length / parPart)} parts dans ${dossier}.`);
} else if (commande === "chercher") {
  const [dossier, n] = args;
  const part = lire(join(dossier, `part-${n}.json`));
  const requetes = lire(join(dossier, `requetes-${n}.json`));
  const pris = new Set(
    (await tout("portraits_suivi", "source_id", (q) => q.eq("source", "pixabay").not("source_id", "is", null))).map((l) => l.source_id),
  );
  mkdirSync(join(dossier, "images"), { recursive: true });
  const candidats = {};
  const planches = [];
  for (const p of part) {
    const q = String(requetes[p.k] ?? "").trim();
    let c = [];
    try {
      if (q.startsWith("WIKI:")) c = await wikipedia(q.slice(5));
      else if (q) c = await pixabay(q, pris);
      if (c.length < 6) c = [...c, ...(await pixabay(generique(p), pris))];
    } catch (e) {
      console.log(p.k, "ERREUR", e.message);
    }
    c = c.filter((x, i) => c.findIndex((y) => y.source_id === x.source_id) === i);
    // Pixabay classe par popularité : les mêmes têtes d'affiche reviennent
    // d'un personnage à l'autre. On garde les 4 premières et on tire les 8
    // autres au hasard dans la suite, pour varier les visages proposés.
    if (c.length > 12 && c[0].source === "pixabay") {
      const suite = c.slice(4).sort(() => Math.random() - 0.5);
      c = [...c.slice(0, 4), ...suite.slice(0, 8)];
    }
    c = c.slice(0, 12);
    const pieces = [];
    for (let i = 0; i < c.length; i++) {
      try {
        const b = await vignette(c[i].apercu);
        const t = await sharp(b).resize(156, 156, { fit: "contain", background: "#fff" }).toBuffer();
        const pos = { left: (i % 4) * 160 + 2, top: Math.floor(i / 4) * 160 + 2 };
        pieces.push({ input: t, ...pos }, { input: etiquette(i, 30, 22, 16, "black", "yellow"), ...pos });
      } catch {
        c[i].illisible = true;
      }
    }
    const planche = join(dossier, "images", `planche-${n}-${p.k}.jpg`);
    await sharp({ create: { width: 640, height: 480, channels: 3, background: "#fff" } }).composite(pieces).jpeg({ quality: 78 }).toFile(planche);
    candidats[p.k] = c;
    planches.push({ k: p.k, planche });
    // Une seule part à la fois : Pixabay accepte 100 demandes par minute.
    await pause(1500);
  }
  writeFileSync(join(dossier, `candidats-${n}.json`), JSON.stringify(candidats));
  for (let f = 0; f * 6 < planches.length; f++) {
    const pieces = [];
    planches.slice(f * 6, f * 6 + 6).forEach(({ k, planche }, j) => {
      const x = (j % 2) * 660;
      const y = Math.floor(j / 2) * 520;
      pieces.push({ input: etiquette(`Personnage ${k}`, 640, 36, 24, "#222", "white"), left: x, top: y }, { input: planche, left: x, top: y + 38 });
    });
    await sharp({ create: { width: 1300, height: 1560, channels: 3, background: "#888" } })
      .composite(pieces)
      .jpeg({ quality: 80 })
      .toFile(join(dossier, `feuilles-${n}-${f + 1}.jpg`));
  }
  console.log(`${planches.length} personnages, ${Math.ceil(planches.length / 6)} feuilles : ${dossier}/feuilles-${n}-*.jpg`);
} else if (commande === "poser") {
  const [dossier, n, option] = args;
  // « sans-rien » : les personnages sans portrait ne sont pas notés au
  // suivi, ils repasseront dans un prochain lot (quand la recherche a été
  // amputée par des vignettes manquantes).
  const sansRien = option === "sans-rien";
  const part = lire(join(dossier, `part-${n}.json`));
  const requetes = lire(join(dossier, `requetes-${n}.json`));
  const candidats = lire(join(dossier, `candidats-${n}.json`));
  const choix = lire(join(dossier, `choix-${n}.json`));
  const lot = basename(dossier);
  const pris = new Set(
    (await tout("portraits_suivi", "source_id", (q) => q.eq("source", "pixabay").not("source_id", "is", null))).map((l) => l.source_id),
  );
  const bilan = { bon: 0, moyen: 0, rien: 0, saute: 0 };
  for (const p of part) {
    const c = choix[p.k];
    if (!c) {
      bilan.saute++;
      continue;
    }
    let avis = ["bon", "moyen"].includes(c.avis) && c.n !== null && c.n !== undefined ? c.avis : "rien";
    let note = c.note ?? null;
    const image = avis === "rien" ? null : candidats[p.k]?.[c.n];
    // Photo déjà donnée à un autre personnage : rien n'est noté, le
    // personnage repassera dans un prochain lot avec d'autres photos.
    if (avis !== "rien" && image?.source === "pixabay" && pris.has(image.source_id)) {
      bilan.saute++;
      continue;
    }
    if (avis !== "rien" && !image) {
      avis = "rien";
      note = "Choix illisible";
    }
    const { data: perso } = await supabase
      .from("characters")
      .select("id, photo_path, project_id, project:projects(owner_id)")
      .eq("id", p.id)
      .maybeSingle();
    if (!perso || perso.photo_path) {
      bilan.saute++;
      continue;
    }
    if (avis !== "rien") {
      try {
        const r = await fetch(image.url, { headers: AGENT });
        if (!r.ok) throw new Error(`image ${r.status}`);
        const donnees = await sharp(Buffer.from(await r.arrayBuffer()))
          .resize(900, 900, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toBuffer();
        const chemin = `${perso.project.owner_id}/${perso.project_id}-personnage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const depot = await supabase.storage.from("project-media").upload(chemin, donnees, { contentType: "image/jpeg" });
        if (depot.error) throw new Error(depot.error.message);
        const maj = await supabase.from("characters").update({ photo_path: chemin, photo_proposee: true }).eq("id", p.id).is("photo_path", null);
        if (maj.error) throw new Error(maj.error.message);
        if (image.source === "pixabay") pris.add(image.source_id);
        writeFileSync(join(dossier, "images", `pose-${p.id}.jpg`), await sharp(donnees).resize(300, 300, { fit: "contain", background: "#eee" }).jpeg({ quality: 80 }).toBuffer());
      } catch (e) {
        console.log(p.k, p.nom, "ÉCHEC", e.message);
        bilan.saute++;
        continue;
      }
      await pause(300);
    }
    if (avis === "rien" && sansRien) {
      bilan.saute++;
      continue;
    }
    const suivi = await supabase.from("portraits_suivi").upsert({
      character_id: p.id,
      lot,
      avis,
      note,
      requete: String(requetes[p.k] ?? ""),
      source: image?.source ?? null,
      source_id: image?.source_id ?? null,
    });
    if (suivi.error) console.log(p.k, "suivi :", suivi.error.message);
    bilan[avis]++;
  }
  console.log(`part ${n} :`, bilan);
} else if (commande === "fiche") {
  const [dossier] = args;
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun, WidthType, HeadingLevel, ExternalHyperlink } = await import("docx");
  const lot = basename(dossier);
  const suivi = await tout("portraits_suivi", "character_id, avis, note, requete", (q) => q.eq("lot", lot));
  const parts = readdirSync(dossier).filter((f) => /^part-\d+\.json$/.test(f)).flatMap((f) => lire(join(dossier, f)));
  const parId = new Map(parts.map((p) => [p.id, p]));
  const cellule = (enfants, largeur) => new TableCell({ children: enfants, width: { size: largeur, type: WidthType.PERCENTAGE } });
  const texte = (t, options = {}) => new Paragraph({ children: [new TextRun({ text: t, size: 18, ...options })] });
  const tableau = (lignes, avecImage) => {
    const titres = avecImage ? ["Personnage", "Description (début)", "Portrait posé", "Ce qui cloche"] : ["Personnage", "Description (début)", "Pourquoi"];
    const largeurs = avecImage ? [24, 36, 20, 20] : [28, 44, 28];
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: titres.map((t, i) => cellule([texte(t, { bold: true, size: 20 })], largeurs[i])) }),
        ...lignes.map((s) => {
          const p = parId.get(s.character_id);
          const lien = `https://app.wefilmgood.com/projet/${p.project_id}/personnages`;
          const image = join(dossier, "images", `pose-${p.id}.jpg`);
          return new TableRow({
            cantSplit: true,
            children: [
              cellule(
                [
                  texte(p.nom, { bold: true, size: 20 }),
                  texte(`« ${p.projet} »`, { italics: true }),
                  new Paragraph({ children: [new ExternalHyperlink({ link: lien, children: [new TextRun({ text: "Ouvrir les personnages du projet", style: "Hyperlink", size: 18 })] })] }),
                  // Une recherche toute prête sur Unsplash et Adobe Stock (photos gratuites), avec les
                  // mots qui ont servi chez Pixabay : Sarah y choisit à la main.
                  ...(s.requete && !s.requete.startsWith("WIKI:")
                    ? [
                        new Paragraph({ children: [new ExternalHyperlink({ link: `https://unsplash.com/fr/s/photos/${encodeURIComponent(s.requete.replace(/\s+/g, "-"))}`, children: [new TextRun({ text: "Chercher une autre photo sur Unsplash", style: "Hyperlink", size: 18 })] })] }),
                        // La collection gratuite d'Adobe Stock (adresse vérifiée par Sarah le 01/10).
                        new Paragraph({ children: [new ExternalHyperlink({ link: `https://stock.adobe.com/fr/search/free?k=${encodeURIComponent(s.requete)}`, children: [new TextRun({ text: "Chercher sur Adobe Stock (gratuit)", style: "Hyperlink", size: 18 })] })] }),
                      ]
                    : []),
                ],
                largeurs[0],
              ),
              cellule([texte(p.description.slice(0, 380) + (p.description.length > 380 ? "…" : "") || "(pas de description)")], largeurs[1]),
              ...(avecImage
                ? [cellule([existsSync(image) ? new Paragraph({ children: [new ImageRun({ type: "jpg", data: readFileSync(image), transformation: { width: 130, height: 130 } })] }) : texte("—")], largeurs[2])]
                : []),
              cellule([texte(s.note ?? "")], largeurs[avecImage ? 3 : 2]),
            ],
          });
        }),
      ],
    });
  };
  const compte = (a) => suivi.filter((s) => s.avis === a).length;
  const moyens = suivi.filter((s) => s.avis === "moyen" && parId.has(s.character_id));
  const riens = suivi.filter((s) => s.avis === "rien" && parId.has(s.character_id));
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: `Portraits proposés — lot du ${lot}`, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [new TextRun(`${suivi.length} personnages traités : ${compte("bon")} bons, ${compte("moyen")} moyens, ${compte("rien")} sans portrait convenable. Les bons et les moyens sont en ligne.`)] }),
          new Paragraph({ children: [new TextRun("Pour changer un portrait : ouvrir le lien, aller au cadre du personnage, déposer une autre image (« Remplacer le portrait » ou « Portrait »), puis Enregistrer. Pour valider un portrait moyen : ne rien faire.")] }),
          new Paragraph({ text: `Portraits moyens, à valider ou à changer (${moyens.length})`, heading: HeadingLevel.HEADING_2 }),
          ...(moyens.length ? [tableau(moyens, true)] : [texte("Aucun.")]),
          new Paragraph({ text: `Personnages restés sans portrait (${riens.length})`, heading: HeadingLevel.HEADING_2 }),
          ...(riens.length ? [tableau(riens, false)] : [texte("Aucun.")]),
        ],
      },
    ],
  });
  const fichier = `/home/wfg/exports/Portraits lot ${lot} — moyens et sans portrait.docx`;
  writeFileSync(fichier, await Packer.toBuffer(doc));
  console.log(fichier, { bon: compte("bon"), moyen: compte("moyen"), rien: compte("rien") });
} else {
  console.log("Commandes : reste | lot <combien> <par part> <dossier> | chercher <dossier> <N> | poser <dossier> <N> | fiche <dossier>");
}
