// Rapatriement des images de WFG 1 (avatars, vignettes/moodboards de
// projet, portraits de personnages), depuis l'export extrait dans
// ~/imports/extrait/img/. Lancé une fois, à la main, par Sarah.
//
// Chaque catégorie se relie par l'identifiant hérité déjà posé dans la
// base (profiles.legacy_id, projects.legacy_id, characters.legacy_id).
// Idempotent : une image déjà déposée pour un projet (vignette ou
// moodboard) ou un personnage n'est pas redéposée ; un avatar déjà
// présent n'est pas remplacé.
import { readFileSync, readdirSync, statSync } from "node:fs";
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
const RACINE = "/home/wfg/imports/extrait/img";
const MAX_MOODBOARD = 10;
const LARGEUR_MAX = 1600;

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

// L'API renvoie au plus 1 000 lignes par lecture : on lit tout, page
// par page. (Le premier passage l'ignorait et ne voyait que les 1 000
// premiers profils, projets et personnages.)
async function toutLire(construire) {
  const tout = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await construire().range(debut, debut + 999);
    if (error) throw error;
    tout.push(...data);
    if (data.length < 1000) return tout;
  }
}

let nAvatars = 0, nAvatarsIgnores = 0, nAvatarsEchoues = 0;
let nVignettes = 0, nMoodboard = 0, nProjetsSansCorrespondance = 0, nProjetsEchoues = 0;
let nPersonnages = 0, nPersonnagesIgnores = 0, nPersonnagesEchoues = 0;

// ---------------------------------------------------------------------
// 1. Avatars — img/avatars/<user_id>.ext → profiles.legacy_id
// ---------------------------------------------------------------------
async function importerAvatars() {
  const profils = await toutLire(() =>
    supabase.from("profiles").select("id, legacy_id, avatar_url").not("legacy_id", "is", null).order("id"),
  );
  const parLegacyId = new Map(profils.map((p) => [p.legacy_id, p]));

  const fichiers = readdirSync(join(RACINE, "avatars"));
  for (const fichier of fichiers) {
    const id = fichier.replace(/\.[a-zA-Z0-9]+$/, "");
    const profil = parLegacyId.get(id);
    if (!profil) continue;
    if (profil.avatar_url) { nAvatarsIgnores++; continue; }

    try {
      const { donnees, type } = await alleger(join(RACINE, "avatars", fichier));
      const chemin = `${profil.id}/avatar-${Date.now()}`;
      const { error } = await supabase.storage.from("avatars").upload(chemin, donnees, {
        contentType: type,
        upsert: true,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(chemin);
      const { error: err2 } = await supabase
        .from("profiles")
        .update({ avatar_url: pub.publicUrl })
        .eq("id", profil.id);
      if (err2) throw err2;
      nAvatars++;
    } catch (e) {
      nAvatarsEchoues++;
      console.error("avatar", fichier, e.message ?? e);
    }
    if ((nAvatars + nAvatarsIgnores + nAvatarsEchoues) % 200 === 0) {
      console.log(`avatars: ${nAvatars} déposés, ${nAvatarsIgnores} déjà présents, ${nAvatarsEchoues} échoués`);
    }
  }
}

// ---------------------------------------------------------------------
// 2. Vignette + Moodboard — img/projects/<user_id>/project<ID>.ext.
//
//    Le dossier porte l'identifiant du COMPTE propriétaire, pas celui
//    du projet (vérifié : dossier « 116 » = user_id 116, seize projets
//    dedans). Le vrai identifiant du projet est dans le nom du fichier
//    lui-même, « project<ID>.ext », confirmé sur les 5 375 fichiers.
//    On matche donc par ce nombre, jamais par le nom du dossier.
//
//    Le premier fichier rencontré pour un projet devient sa vignette ;
//    un doublon éventuel (même projet, deux fichiers) part en Moodboard.
// ---------------------------------------------------------------------
const NOM_FICHIER_PROJET = /^project(\d+)\.[a-zA-Z0-9]+$/i;

async function importerProjets() {
  const projets = await toutLire(() =>
    supabase.from("projects").select("id, owner_id, legacy_id").not("legacy_id", "is", null).order("id"),
  );
  const parLegacyId = new Map(projets.map((p) => [p.legacy_id, p]));

  const existants = await toutLire(() =>
    supabase
      .from("project_files")
      .select("project_id, kind, legacy_id")
      .in("kind", ["vignette", "moodboard"])
      .order("id"),
  );
  // Un fichier de l'export déjà posé (vignette ou Moodboard) ne se
  // repose jamais : on le reconnaît à son legacy_id « dossier/fichier ».
  const dejaPoses = new Set(existants.map((f) => f.legacy_id).filter(Boolean));
  const dejaVignette = new Set(
    (existants ?? []).filter((f) => f.kind === "vignette").map((f) => f.project_id),
  );
  const moodboardCompte = new Map();
  for (const f of existants ?? []) {
    if (f.kind !== "moodboard") continue;
    moodboardCompte.set(f.project_id, (moodboardCompte.get(f.project_id) ?? 0) + 1);
  }

  const dossiers = readdirSync(join(RACINE, "projects"));
  let vus = 0;
  for (const dossier of dossiers) {
    const dossierComplet = join(RACINE, "projects", dossier);
    if (!statSync(dossierComplet).isDirectory()) continue;
    const fichiers = readdirSync(dossierComplet).sort();

    for (const fichier of fichiers) {
      vus++;
      const trouve = fichier.match(NOM_FICHIER_PROJET);
      const projet = trouve ? parLegacyId.get(trouve[1]) : undefined;
      if (!projet) { nProjetsSansCorrespondance++; continue; }
      if (dejaPoses.has(`${dossier}/${fichier}`)) continue;

      const moodboardActuel = moodboardCompte.get(projet.id) ?? 0;
      const estVignette = !dejaVignette.has(projet.id);
      const estMoodboard = !estVignette && moodboardActuel < MAX_MOODBOARD;
      if (!estVignette && !estMoodboard) continue;

      try {
        const { donnees, type } = await alleger(join(dossierComplet, fichier));
        const etiquette = estVignette ? "vignette" : "moodboard";
        const chemin = `${projet.owner_id}/${projet.id}-${etiquette}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const { error } = await supabase.storage.from("project-media").upload(chemin, donnees, {
          contentType: type,
        });
        if (error) throw error;
        const { error: err2 } = await supabase.from("project_files").insert({
          project_id: projet.id,
          storage_path: chemin,
          kind: etiquette,
          original_name: fichier,
          legacy_id: `${dossier}/${fichier}`,
        });
        if (err2) throw err2;
        if (estVignette) { nVignettes++; dejaVignette.add(projet.id); }
        else { nMoodboard++; moodboardCompte.set(projet.id, moodboardActuel + 1); }
      } catch (e) {
        nProjetsEchoues++;
        console.error("projet", dossier, fichier, e.message ?? e);
      }
    }
    if (vus % 500 < fichiers.length) {
      console.log(`projets: ${nVignettes} vignettes, ${nMoodboard} moodboard, ${nProjetsSansCorrespondance} sans fiche WFG 2, ${nProjetsEchoues} échoués`);
    }
  }
}

// ---------------------------------------------------------------------
// 3. Portraits de personnages — img/characters/<legacy_id>.ext → characters.legacy_id
// ---------------------------------------------------------------------
async function importerPersonnages() {
  const personnages = await toutLire(() =>
    supabase
      .from("characters")
      .select("id, project_id, legacy_id, photo_path, projects(owner_id)")
      .not("legacy_id", "is", null)
      .order("id"),
  );
  const parLegacyId = new Map(personnages.map((c) => [c.legacy_id, c]));

  const fichiers = readdirSync(join(RACINE, "characters"));
  for (const fichier of fichiers) {
    const id = fichier.replace(/\.[a-zA-Z0-9]+$/, "");
    const personnage = parLegacyId.get(id);
    if (!personnage) continue;
    if (personnage.photo_path) { nPersonnagesIgnores++; continue; }

    try {
      const { donnees, type } = await alleger(join(RACINE, "characters", fichier));
      const ownerId = personnage.projects?.owner_id;
      const chemin = `${ownerId}/${personnage.project_id}-personnage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const { error } = await supabase.storage.from("project-media").upload(chemin, donnees, {
        contentType: type,
      });
      if (error) throw error;
      const { error: err2 } = await supabase
        .from("characters")
        .update({ photo_path: chemin })
        .eq("id", personnage.id);
      if (err2) throw err2;
      nPersonnages++;
    } catch (e) {
      nPersonnagesEchoues++;
      console.error("personnage", fichier, e.message ?? e);
    }
    if ((nPersonnages + nPersonnagesIgnores + nPersonnagesEchoues) % 200 === 0) {
      console.log(`personnages: ${nPersonnages} déposés, ${nPersonnagesIgnores} déjà présents, ${nPersonnagesEchoues} échoués`);
    }
  }
}

await importerAvatars();
console.log(`AVATARS terminés : ${nAvatars} déposés, ${nAvatarsIgnores} déjà présents, ${nAvatarsEchoues} échoués`);

await importerProjets();
console.log(`PROJETS terminés : ${nVignettes} vignettes, ${nMoodboard} moodboard, ${nProjetsSansCorrespondance} sans fiche WFG 2, ${nProjetsEchoues} échoués`);

await importerPersonnages();
console.log(`PERSONNAGES terminés : ${nPersonnages} déposés, ${nPersonnagesIgnores} déjà présents, ${nPersonnagesEchoues} échoués`);
