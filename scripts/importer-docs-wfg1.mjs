// Rapatriement des PHOTOS annexes des projets de WFG 1 (les « documents »
// joints à un projet : photos, dessins…), depuis le dossier
// ~/imports/docs/ rapatrié par FTP le 26/09/2026 :
//   ~/imports/docs/<compte>/<projet>/docs/<fichier>
// Puis (26/09, décision de Sarah) les PDF du même dossier : le
// `project.pdf` de chaque projet = son scénario (kind « scenario », un
// seul par fiche, jamais par-dessus un scénario déjà déposé sur WFG 2),
// et les PDF de `docs/` = documents annexes (kind « document »,
// migration 0079). Tous dans le bucket privé « scenarios », sous le
// dossier de l'auteur. Le stockage refuse les fichiers de plus de 50 Mo
// (FILE_SIZE_LIMIT) : ils sont comptés et listés, pas déposés. Les
// originaux gardés par l'allègement (`.orig.pdf`) sont ignorés — une
// passe du 26/09 les avait pris pour des documents, 1 309 doublons
// retirés (scripts/retirer-doublons-orig-wfg1.mjs).
//
// Chaque photo va dans le Moodboard de sa fiche WFG 2 (projects.legacy_id
// = numéro du projet WFG 1), dans la limite du site (MAX_MOODBOARD, 10) :
// au-delà, les photos suivantes (dans l'ordre des noms) sont laissées de
// côté et comptées. Idempotent : une photo déjà posée (legacy_id
// « docs/<compte>/<projet>/<fichier> ») n'est pas redéposée.
//
// Lancement : node scripts/importer-docs-wfg1.mjs
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
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
const RACINE = "/home/wfg/imports/docs";
const MAX_MOODBOARD = 10; // la même limite que le site (src/app/projet/[id]/fichiers.ts)
const LARGEUR_MAX = 1600;
const IMAGE = /\.(jpe?g|png|gif|webp)$/i;

async function alleger(chemin) {
  const origine = readFileSync(chemin);
  try {
    const image = sharp(origine, { failOn: "none" }).rotate();
    const infos = await image.metadata();
    const transparent = infos.hasAlpha === true;
    const redim = image.resize({ width: LARGEUR_MAX, withoutEnlargement: true });
    const donnees = transparent
      ? await redim.png({ compressionLevel: 9, palette: true }).toBuffer()
      : await redim.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    if (donnees.length >= origine.length) return { donnees: origine, type: "image/jpeg" };
    return { donnees, type: transparent ? "image/png" : "image/jpeg" };
  } catch {
    return { donnees: origine, type: "image/jpeg" };
  }
}

// L'API renvoie au plus 1 000 lignes par lecture : on lit tout, page par page.
async function toutLire(construire) {
  const tout = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await construire().range(debut, debut + 999);
    if (error) throw error;
    tout.push(...data);
    if (data.length < 1000) return tout;
  }
}

const projets = await toutLire(() =>
  supabase.from("projects").select("id, owner_id, legacy_id").not("legacy_id", "is", null).order("id"),
);
const parLegacyId = new Map(projets.map((p) => [String(p.legacy_id), p]));

const existants = await toutLire(() =>
  supabase.from("project_files").select("project_id, kind, legacy_id").eq("kind", "moodboard").order("id"),
);
const dejaPoses = new Set(existants.map((f) => f.legacy_id).filter(Boolean));
const moodboardCompte = new Map();
for (const f of existants) moodboardCompte.set(f.project_id, (moodboardCompte.get(f.project_id) ?? 0) + 1);

let nDeposees = 0, nDejaPosees = 0, nSansFiche = 0, nAuDela = 0, nEchouees = 0;
const projetsTouches = new Set();
const projetsAuDela = new Map();

for (const compte of readdirSync(RACINE)) {
  const dossierCompte = join(RACINE, compte);
  if (!/^\d+$/.test(compte) || !statSync(dossierCompte).isDirectory()) continue;
  for (const projetWfg1 of readdirSync(dossierCompte)) {
    const dossierDocs = join(dossierCompte, projetWfg1, "docs");
    if (!/^\d+$/.test(projetWfg1) || !existsSync(dossierDocs)) continue;
    const photos = readdirSync(dossierDocs).filter((f) => IMAGE.test(f)).sort();
    if (photos.length === 0) continue;

    const projet = parLegacyId.get(projetWfg1);
    if (!projet) { nSansFiche += photos.length; continue; }

    for (const fichier of photos) {
      const legacyId = `docs/${compte}/${projetWfg1}/${fichier}`;
      if (dejaPoses.has(legacyId)) { nDejaPosees++; continue; }
      const actuel = moodboardCompte.get(projet.id) ?? 0;
      if (actuel >= MAX_MOODBOARD) {
        nAuDela++;
        projetsAuDela.set(projetWfg1, (projetsAuDela.get(projetWfg1) ?? 0) + 1);
        continue;
      }
      try {
        const { donnees, type } = await alleger(join(dossierDocs, fichier));
        const chemin = `${projet.owner_id}/${projet.id}-moodboard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const { error } = await supabase.storage.from("project-media").upload(chemin, donnees, { contentType: type });
        if (error) throw error;
        const { error: err2 } = await supabase.from("project_files").insert({
          project_id: projet.id,
          storage_path: chemin,
          kind: "moodboard",
          original_name: fichier,
          legacy_id: legacyId,
        });
        if (err2) throw err2;
        nDeposees++;
        projetsTouches.add(projet.id);
        moodboardCompte.set(projet.id, actuel + 1);
      } catch (e) {
        nEchouees++;
        console.error("photo", legacyId, e.message ?? e);
      }
    }
  }
}

console.log(
  `photos : ${nDeposees} déposées sur ${projetsTouches.size} fiches, ${nDejaPosees} déjà présentes, ` +
    `${nAuDela} au-delà de ${MAX_MOODBOARD} par fiche, ${nSansFiche} sans fiche WFG 2, ${nEchouees} échouées`,
);
for (const [p, n] of projetsAuDela) console.log(`  projet WFG 1 n° ${p} : ${n} photo(s) laissée(s) de côté`);

// ---------------------------------------------------------------------
// 2. Scénarios et documents annexes (PDF)
// ---------------------------------------------------------------------
const LIMITE_STOCKAGE = 50 * 1024 * 1024;
const pdfExistants = await toutLire(() =>
  supabase.from("project_files").select("project_id, kind, legacy_id").in("kind", ["scenario", "document"]).order("id"),
);
const pdfDejaPoses = new Set(pdfExistants.map((f) => f.legacy_id).filter(Boolean));
const aDejaScenario = new Set(pdfExistants.filter((f) => f.kind === "scenario").map((f) => f.project_id));

const bilan = { scenario: { deposes: 0, deja: 0, tropGros: [] , echoues: 0 }, document: { deposes: 0, deja: 0, tropGros: [], echoues: 0 } };
let nPdfSansFiche = 0;

async function deposerPdf(projet, cheminLocal, fichier, kind, legacyId) {
  const b = bilan[kind];
  if (pdfDejaPoses.has(legacyId)) { b.deja++; return; }
  const taille = statSync(cheminLocal).size;
  if (taille > LIMITE_STOCKAGE) { b.tropGros.push(`${legacyId} (${Math.round(taille / 1048576)} Mo)`); return; }
  try {
    const chemin = `${projet.owner_id}/${projet.id}-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
    const { error } = await supabase.storage.from("scenarios").upload(chemin, readFileSync(cheminLocal), { contentType: "application/pdf" });
    if (error) throw error;
    const { error: err2 } = await supabase.from("project_files").insert({
      project_id: projet.id, storage_path: chemin, kind, original_name: fichier, legacy_id: legacyId,
    });
    if (err2) throw err2;
    b.deposes++;
    pdfDejaPoses.add(legacyId);
  } catch (e) {
    b.echoues++;
    console.error(kind, legacyId, e.message ?? e);
  }
}

for (const compte of readdirSync(RACINE)) {
  const dossierCompte = join(RACINE, compte);
  if (!/^\d+$/.test(compte) || !statSync(dossierCompte).isDirectory()) continue;
  for (const projetWfg1 of readdirSync(dossierCompte)) {
    const dossierProjet = join(dossierCompte, projetWfg1);
    if (!/^\d+$/.test(projetWfg1) || !statSync(dossierProjet).isDirectory()) continue;
    const projet = parLegacyId.get(projetWfg1);
    const scenarioLocal = join(dossierProjet, "project.pdf");
    const dossierDocs = join(dossierProjet, "docs");
    const annexes = existsSync(dossierDocs) ? readdirSync(dossierDocs).filter((f) => /\.pdf$/i.test(f) && !/\.(orig|leger)\.pdf$/i.test(f)).sort() : [];
    if (!projet) { nPdfSansFiche += (existsSync(scenarioLocal) ? 1 : 0) + annexes.length; continue; }

    if (existsSync(scenarioLocal) && !aDejaScenario.has(projet.id)) {
      await deposerPdf(projet, scenarioLocal, "project.pdf", "scenario", `docs/${compte}/${projetWfg1}/project.pdf`);
      aDejaScenario.add(projet.id);
    }
    for (const fichier of annexes) {
      await deposerPdf(projet, join(dossierDocs, fichier), fichier, "document", `docs/${compte}/${projetWfg1}/${fichier}`);
    }
  }
}

for (const kind of ["scenario", "document"]) {
  const b = bilan[kind];
  console.log(`${kind} : ${b.deposes} déposés, ${b.deja} déjà présents, ${b.tropGros.length} trop gros (> 50 Mo), ${b.echoues} échoués`);
  for (const t of b.tropGros) console.log(`  trop gros : ${t}`);
}
console.log(`PDF sans fiche WFG 2 : ${nPdfSansFiche}`);
