// Rattache aux films du CNC (table films_cnc) leurs entrées en salles en
// France, tirées de la base LUMIERE de l'Observatoire européen de
// l'audiovisuel (https://lumiere.obs.coe.int/, gratuite, entrées par film
// depuis 1996). Le CNC ne publie pas ces entrées film par film.
//
// Pour chaque film : recherche par titre (puis, à défaut, par réalisateur)
// dans l'année d'agrément et les deux suivantes, puis lecture de la fiche
// LUMIERE du film. La fiche LUMIERE renvoie vers la fiche du CNC : si le
// numéro de visa est le même, le rapprochement est certain (« visa »).
// Sinon on n'accepte que titre très proche + même réalisateur + bonne
// année (« titre et réalisateur »). Rien d'autre n'est rattaché : un film
// non retrouvé garde des entrées vides, jamais un chiffre inventé.
//
// Le site demande de rester raisonnable (robots.txt : /search et /movie
// autorisés, /work interdit) : une seule requête à la fois, une demi-seconde
// d'écart, tout est gardé dans ~/imports/cnc/lumiere/ pour ne jamais
// redemander la même page.
//
// Usage :
//   node scripts/rattacher-entrees-films-cnc.mjs --recuperer [--echantillon N]  (réseau, reprenable)
//   node scripts/rattacher-entrees-films-cnc.mjs --appliquer [--essai]          (écrit dans films_cnc)
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { connexion, toutLire, normaliserTitre, nomsDeFamille, simplifier } from "./films-cnc-outils.mjs";

const RACINE = "/home/wfg/imports/cnc/lumiere";
const BASE = "https://lumiere.obs.coe.int";
const PAUSE_MS = 500;
const UA = "WeFilmGood-recherche/1.0 (+https://wefilmgood.com)";
const args = process.argv.slice(2);
const SOURCE_VISA = "LUMIERE (Observatoire européen de l'audiovisuel), rapprochement par visa CNC";
const SOURCE_TITRE = "LUMIERE (Observatoire européen de l'audiovisuel), rapprochement par titre et réalisateur";

for (const d of ["recherches", "films"]) mkdirSync(`${RACINE}/${d}`, { recursive: true });
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
const decoder = (s) =>
  s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(+c)).replace(/&amp;/g, "&");
const nettoyer = (h) => decoder(h.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const nombre = (t) => (/\d/.test(t) ? Number(t.replace(/\D/g, "")) : null);

async function demander(url, options) {
  for (let essai = 1; ; essai++) {
    await attendre(PAUSE_MS);
    try {
      const r = await fetch(url, { ...options, headers: { "user-agent": UA, ...(options?.headers || {}) } });
      if (r.ok) return await r.text();
      if (r.status === 404) return null;
      throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      if (essai >= 4) throw e;
      console.log(`  (nouvel essai ${essai} : ${e.message})`);
      await attendre(5000 * essai);
    }
  }
}

// Recherche LUMIERE : France (y compris coproductions minoritaires), années de production données.
async function rechercher(criteres, debut, fin) {
  const corps = new URLSearchParams({
    ...criteres, production_country: "FR", include_minority_coproducing_country: "y",
    prod_start_year: String(debut), prod_end_year: String(fin), exp_start_year: "1996", exp_end_year: "2026",
  });
  const cle = createHash("sha1").update(corps.toString()).digest("hex");
  const fichier = `${RACINE}/recherches/${cle}.json`;
  if (existsSync(fichier)) return JSON.parse(readFileSync(fichier, "utf8"));
  const html = await demander(`${BASE}/search`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: corps });
  const lignes = [];
  for (const tr of (html || "").split("<tr>").slice(1)) {
    const id = tr.match(/\/movie\/(\d+)/);
    if (!id) continue;
    const c = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => nettoyer(m[1]));
    lignes.push({ id: id[1], titre: c[1], pays: c[2], annee: Number(c[5]) || null, realisateurs: c[6] || "" });
  }
  writeFileSync(fichier, JSON.stringify({ criteres: corps.toString(), lignes }));
  return { lignes };
}

// Fiche d'un film LUMIERE : visa du CNC (lien « CNC (FR) »), année de production, entrées en France.
async function lireFilm(id) {
  const fichier = `${RACINE}/films/${id}.json`;
  if (existsSync(fichier)) return JSON.parse(readFileSync(fichier, "utf8"));
  const html = await demander(`${BASE}/movie/${id}`);
  if (!html) return null;
  const visa = html.match(/cnc\.fr\/professionnels\/visas-et-classification\/(\d+)/);
  const titre = html.match(/id="main-content"[\s\S]*?<h\d[^>]*>([\s\S]*?)<\/h\d>/);
  const annee = html.match(/Production year:[\s\S]*?(\d{4})/);
  const france = [];
  for (const tr of html.split("<tr>").slice(1)) {
    const c = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => nettoyer(m[1]));
    if (c[0] === "FR" && c.length >= 4) france.push({ distributeur: c[1], sortie: c[2], total: nombre(c[3]) });
  }
  const film = {
    id, titre: titre ? nettoyer(titre[1]) : null, visa: visa ? Number(visa[1]) : null,
    annee_production: annee ? Number(annee[1]) : null, france,
  };
  writeFileSync(fichier, JSON.stringify(film));
  return film;
}

// « Comte de Monte-Cristo (Le) » -> « Le Comte de Monte-Cristo » pour interroger LUMIERE.
function titreDeRecherche(titre) {
  const m = titre.match(/^(.*?)\s*\((l['’]|le|la|les|un|une|des|the|il|el)\)\s*$/i);
  if (m) return m[2].endsWith("'") || m[2].endsWith("’") ? `${m[2]}${m[1]}` : `${m[2]} ${m[1]}`;
  return titre.replace(/^\((.*?)\)\s*/, "$1 ");
}
function scoreTitre(titreCnc, titreLumiere) {
  const c = new Set(normaliserTitre(titreCnc).split(" ").filter(Boolean));
  const l = new Set(normaliserTitre(titreLumiere).split(" ").filter(Boolean));
  if (!c.size) return 0;
  return [...c].filter((m) => l.has(m)).length / c.size;
}
function memeRealisateur(noms, realisateursLumiere) {
  const haystack = ` ${simplifier(realisateursLumiere)} `;
  return noms.some((n) => n && haystack.includes(` ${n} `));
}

// Cherche le film LUMIERE correspondant à un film du CNC. Renvoie null ou { film, methode }.
async function rapprocher(f) {
  const debut = f.annee_agrement - 1, fin = f.annee_agrement + 2;
  const noms = nomsDeFamille(f.realisateur);
  const dejaVus = new Map();
  const verifier = async (id) => {
    if (!dejaVus.has(id)) dejaVus.set(id, await lireFilm(id));
    return dejaVus.get(id);
  };
  const candidats = new Map();
  const ajouter = (lignes) => {
    for (const l of lignes) {
      if (l.annee && (l.annee < debut || l.annee > fin)) continue;
      candidats.set(l.id, { ...l, titreScore: scoreTitre(f.titre, l.titre), dir: memeRealisateur(noms, l.realisateurs) });
    }
  };
  const meilleurs = (filtre, n) =>
    [...candidats.values()].filter(filtre).sort((a, b) => b.titreScore + (b.dir ? 1 : 0) - (a.titreScore + (a.dir ? 1 : 0))).slice(0, n);

  ajouter((await rechercher({ title: titreDeRecherche(f.titre) }, debut, fin)).lignes);
  let essais = meilleurs((c) => c.dir || c.titreScore >= 0.99, 3);
  const nom1 = (f.realisateur || "").split("/")[0].trim().split(/\s+/).filter((m) => m === m.toUpperCase()).sort((a, b) => b.length - a.length)[0];
  if (!essais.length && nom1) {
    ajouter((await rechercher({ director: nom1 }, debut, fin)).lignes);
    essais = meilleurs((c) => c.dir, 4);
  }
  let repli = null;
  for (const c of essais) {
    const film = await verifier(c.id);
    if (!film) continue;
    if (film.visa === f.visa) return { film, methode: "visa" };
    if (!repli && c.dir && c.titreScore >= 0.75 && !(film.visa && film.visa !== f.visa)) repli = { film, methode: "titre et réalisateur" };
  }
  return repli;
}

async function recuperer() {
  const supabase = connexion();
  let films = await toutLire(() => supabase.from("films_cnc").select("id,visa,annee_agrement,titre,realisateur").order("id"));
  const iEch = args.indexOf("--echantillon");
  if (iEch >= 0) {
    const n = Number(args[iEch + 1]);
    films = films.filter((_, i) => i % Math.floor(films.length / n) === 0).slice(0, n);
  }
  const sortie = `${RACINE}/resultats.json`;
  const resultats = existsSync(sortie) ? JSON.parse(readFileSync(sortie, "utf8")) : {};
  let fait = 0;
  for (const f of films) {
    if (resultats[f.id]) continue;
    const r = await rapprocher(f);
    const fr = r?.film.france ?? [];
    resultats[f.id] = r
      ? {
          methode: r.methode, lumiere_id: r.film.id, titre_lumiere: r.film.titre, annee_production: r.film.annee_production,
          entrees_france: fr.length && fr.every((x) => x.total !== null) ? fr.reduce((s, x) => s + x.total, 0) : null,
          annee_sortie: fr.map((x) => Number(x.sortie.slice(-4))).filter(Boolean).sort()[0] ?? null,
          distributeur: fr[0]?.distributeur ?? null,
        }
      : { methode: null };
    if (++fait % 25 === 0) {
      writeFileSync(sortie, JSON.stringify(resultats));
      console.log(`${new Date().toISOString().slice(11, 19)}  ${Object.keys(resultats).length} films traités`);
    }
  }
  writeFileSync(sortie, JSON.stringify(resultats));
  console.log(`Terminé : ${Object.keys(resultats).length} films traités.`);
}

async function appliquer() {
  const resultats = JSON.parse(readFileSync(`${RACINE}/resultats.json`, "utf8"));
  const supabase = connexion();
  let n = 0;
  for (const [id, r] of Object.entries(resultats)) {
    if (!r.methode) continue;
    const maj = {
      lumiere_id: r.lumiere_id,
      entrees_france: r.entrees_france,
      annee_sortie: r.annee_sortie,
      source_entrees: r.methode === "visa" ? SOURCE_VISA : SOURCE_TITRE,
    };
    n++;
    if (args.includes("--essai")) continue;
    const { error } = await supabase.from("films_cnc").update(maj).eq("id", Number(id));
    if (error) throw error;
  }
  console.log(`${n} films rattachés${args.includes("--essai") ? " (essai, rien écrit)" : ""}.`);
}

if (args.includes("--recuperer")) await recuperer();
else if (args.includes("--appliquer")) await appliquer();
else console.log("Voir l'en-tête du script : --recuperer ou --appliquer.");
