// Range les photos d'un export officiel Facebook (page Maison des
// Scénaristes ou WeFilmGood) dans le bucket photos-archives et la table
// photos_archives (migration 0206, 24/10/2026).
//
//   node scripts/importer-photos-facebook.mjs <dossier du dépôt>
//
// Le dossier du dépôt (~/photos-facebook/depots/<id>/) contient le .zip
// envoyé depuis /admin/photos et etat.json, où le script note son avancée
// pour la page. Idempotent : une photo déjà rangée (même chemin dans
// l'export) n'est pas reprise.
//
// Les textes des exports Facebook sont de l'UTF-8 relu en latin-1
// (« Ã© » pour « é ») : on les remet d'aplomb.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const BUCKET = "photos-archives";
const IMAGES = /\.(jpe?g|png|webp|gif|heic)$/i;

const dossier = process.argv[2];
if (!dossier || !existsSync(join(dossier, "etat.json"))) {
  console.error("Usage : node scripts/importer-photos-facebook.mjs <dossier du dépôt>");
  process.exit(1);
}
const fichierEtat = join(dossier, "etat.json");
const etat = JSON.parse(readFileSync(fichierEtat, "utf8"));
const noter = (champs) => {
  Object.assign(etat, champs, { maj: new Date().toISOString() });
  writeFileSync(fichierEtat, JSON.stringify(etat, null, 2));
};

const reparer = (t) => {
  if (typeof t !== "string") return null;
  try {
    const r = Buffer.from(t, "latin1").toString("utf8");
    return r.includes("�") ? t : r;
  } catch {
    return t;
  }
};
const date = (s) => (typeof s === "number" && s > 0 ? new Date(s * 1000).toISOString() : null);
const slug = (t) =>
  (t || "sans-album")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "album";

function fichiers(racine) {
  const tout = [];
  const pile = [racine];
  while (pile.length) {
    const d = pile.pop();
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) pile.push(p);
      else tout.push(p);
    }
  }
  return tout;
}

async function principal() {
  noter({ etat: "import", message: "Ouverture du fichier", erreur: null });
  const extrait = join(dossier, "extrait");
  rmSync(extrait, { recursive: true, force: true });
  for (const zip of readdirSync(dossier).filter((n) => n.toLowerCase().endsWith(".zip"))) {
    execFileSync("python3", ["-m", "zipfile", "-e", join(dossier, zip), extrait], { stdio: "inherit" });
  }
  if (!existsSync(extrait)) throw new Error("Aucun fichier .zip dans le dépôt.");
  const tous = fichiers(extrait);

  // Un gros export arrive en plusieurs .zip : les fiches d'albums (JSON)
  // peuvent être dans une partie et les photos dans une autre. On garde
  // les JSON de chaque dépôt, et on lit ceux de tous les dépôts de la même page.
  const gardes = join(dossier, "json");
  rmSync(gardes, { recursive: true, force: true });
  for (const f of tous.filter((p) => p.endsWith(".json"))) {
    const cible = join(gardes, relative(extrait, f));
    mkdirSync(dirname(cible), { recursive: true });
    copyFileSync(f, cible);
  }
  const jsons = [];
  for (const autre of readdirSync(dirname(dossier))) {
    const d = join(dirname(dossier), autre);
    try {
      const e = JSON.parse(readFileSync(join(d, "etat.json"), "utf8"));
      if (e.source === etat.source && existsSync(join(d, "json"))) jsons.push(...fichiers(join(d, "json")).filter((p) => p.endsWith(".json")));
    } catch {
      /* pas un dépôt */
    }
  }

  // 1. Les albums : tout JSON qui porte une liste « photos ».
  // 2. Les autres photos citées ailleurs (publications) : objets avec « uri ».
  const infos = new Map(); // chemin relatif -> { album, albumDesc, albumLe, priseLe, legende }
  const ajouter = (uri, champs, prioritaire) => {
    if (typeof uri !== "string" || !IMAGES.test(uri)) return;
    const cle = uri.replace(/^\/+/, "");
    if (!prioritaire && infos.has(cle)) {
      const deja = infos.get(cle);
      if (!deja.legende && champs.legende) deja.legende = champs.legende;
      return;
    }
    infos.set(cle, { ...(infos.get(cle) ?? {}), ...champs });
  };
  const parcourir = (noeud, champsParents) => {
    if (Array.isArray(noeud)) return noeud.forEach((n) => parcourir(n, champsParents));
    if (!noeud || typeof noeud !== "object") return;
    if (typeof noeud.uri === "string") {
      ajouter(
        noeud.uri,
        {
          ...champsParents,
          priseLe: date(noeud.creation_timestamp) ?? champsParents.priseLe ?? null,
          legende: reparer(noeud.description) || champsParents.legende || null,
        },
        false,
      );
    }
    const texteData = Array.isArray(noeud.data) ? noeud.data.map((d) => d && reparer(d.post)).find(Boolean) : null;
    const texte = reparer(noeud.post) || texteData || reparer(noeud.description) || null;
    for (const v of Object.values(noeud)) {
      if (v && typeof v === "object") parcourir(v, { ...champsParents, legende: champsParents.legende || texte, priseLe: date(noeud.timestamp) ?? champsParents.priseLe });
    }
  };
  for (const f of jsons) {
    let json;
    try {
      json = JSON.parse(readFileSync(f, "utf8"));
    } catch {
      continue;
    }
    const albums = Array.isArray(json) ? json : [json];
    for (const a of albums) {
      if (a && Array.isArray(a.photos)) {
        const album = reparer(a.name) || "Sans titre";
        for (const p of a.photos) {
          ajouter(
            p.uri,
            {
              album,
              albumDesc: reparer(a.description),
              albumLe: date(a.last_modified_timestamp),
              priseLe: date(p.creation_timestamp),
              legende: reparer(p.description) || (reparer(p.title) !== album ? reparer(p.title) : null) || null,
            },
            true,
          );
        }
      }
    }
  }
  for (const f of jsons) {
    try {
      parcourir(JSON.parse(readFileSync(f, "utf8")), {});
    } catch {
      /* fichier illisible : ignoré */
    }
  }

  // Les images présentes dans l'export, citées ou non.
  const images = tous.filter((p) => IMAGES.test(p));
  const sources = new Map();
  // Une photo non citée prend l'album de ses voisines du même dossier.
  const albumDuDossier = new Map();
  for (const [k, v] of infos) if (v.album && !albumDuDossier.has(dirname(k))) albumDuDossier.set(dirname(k), v);
  for (const p of images) {
    const rel = relative(extrait, p);
    const voisin = [...albumDuDossier.entries()].find(([k]) => dirname(rel).endsWith(k))?.[1];
    const citee = infos.has(rel) || [...infos.keys()].some((k) => rel.endsWith(k) || k.endsWith(rel));
    if (voisin && !citee) infos.set(rel, { album: voisin.album, albumDesc: voisin.albumDesc, albumLe: voisin.albumLe });
  }
  for (const p of images) {
    const rel = relative(extrait, p);
    // Les « uri » de Facebook partent de la racine de l'export, parfois d'un cran au-dessus.
    const info = infos.get(rel) ?? [...infos.entries()].find(([k]) => rel.endsWith(k) || k.endsWith(rel))?.[1];
    // Hors album (publiées sur le mur) : rangées par année de publication.
    const dossierPhoto = basename(dirname(p));
    const horsAlbum = dossierPhoto === "your_posts" || (!info?.album && dossierPhoto === "media");
    // Le grand album « Photos » de Facebook (photos du journal) mêle toutes
    // les années : découpé par année pour qu'on retrouve chaque photo à la sienne.
    if (info?.album === "Photos" && info.priseLe) info.album = `Photos ${new Date(info.priseLe).getFullYear()}`;
    const annee = info?.priseLe ? new Date(info.priseLe).getFullYear() : null;
    sources.set(
      rel,
      horsAlbum
        ? { ...info, album: annee ? `Publications ${annee}` : "Publications" }
        : info?.album
          ? info
          : { ...info, album: reparer(dossierPhoto.replace(/_\d+$/, "")) || "Sans album" },
    );
  }

  const { data: deja } = await supabase.from("photos_archives").select("chemin_export").eq("source", etat.source).limit(100000);
  const dejaLa = new Set((deja ?? []).map((d) => d.chemin_export));
  let importees = 0, ignorees = 0, echecs = 0;
  noter({ message: null, total: sources.size, importees, ignorees, echecs });

  for (const [rel, info] of sources) {
    if (dejaLa.has(rel)) {
      ignorees++;
      continue;
    }
    try {
      const origine = readFileSync(join(extrait, rel));
      const image = sharp(origine, { failOn: "none" }).rotate();
      const meta = await image.metadata();
      const grand = /\.jpe?g$/i.test(rel) ? origine : await image.clone().jpeg({ quality: 90 }).toBuffer();
      const vignette = await image.clone().resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
      const nom = basename(rel).replace(/\.[^.]+$/, "");
      const base = `${etat.source}/${slug(info.album)}/${nom}`;
      const up1 = await supabase.storage.from(BUCKET).upload(`${base}.jpg`, grand, { contentType: "image/jpeg", upsert: true });
      if (up1.error) throw up1.error;
      const up2 = await supabase.storage.from(BUCKET).upload(`${base}.vignette.jpg`, vignette, { contentType: "image/jpeg", upsert: true });
      if (up2.error) throw up2.error;
      const { error } = await supabase.from("photos_archives").insert({
        source: etat.source,
        album: info.album || "Sans album",
        album_description: info.albumDesc ?? null,
        album_le: info.albumLe ?? null,
        prise_le: info.priseLe ?? null,
        legende: info.legende ?? null,
        chemin_export: rel,
        chemin: `${base}.jpg`,
        chemin_vignette: `${base}.vignette.jpg`,
        largeur: meta.width ?? null,
        hauteur: meta.height ?? null,
      });
      if (error) throw error;
      importees++;
    } catch (e) {
      echecs++;
      console.error(rel, e?.message ?? e);
    }
    if ((importees + echecs) % 20 === 0) noter({ importees, ignorees, echecs });
  }

  rmSync(extrait, { recursive: true, force: true });
  noter({ etat: "fini", importees, ignorees, echecs, fini_le: new Date().toISOString() });
  console.log(`Fini : ${importees} rangées, ${ignorees} déjà là, ${echecs} en échec, sur ${sources.size}.`);
}

principal().catch((e) => {
  console.error(e);
  noter({ etat: "echec", erreur: String(e?.message ?? e) });
  process.exit(1);
});
