// Les PDF « moodboard » / « dessins » de WFG 1 : des PDF annexes sans texte,
// dont chaque page est une image. Repris le 26/09 comme simples documents
// annexes (invisibles sur la fiche) ; le 07/10, Sarah demande que leurs
// images aillent dans le Moodboard de la fiche, sans limite pour les
// anciens projets (elle ne peut pas choisir à la place des auteurs).
//
// Étape 1 (shell, déjà faite) : chaque page rendue en JPEG de 1 600 px de
// large dans ~/imports/pages/<compte>/<projet>/docs/<fichier>-<n>.jpg
// (pdftoppm dans un conteneur alpine). Étape 2 (ce script) : dépôt dans
// « project-media », kind « moodboard », après les photos déjà là.
// Idempotent : legacy_id « docs/<compte>/<projet>/<fichier>.pdf#<page> ».
//
// Lancement : node scripts/importer-pages-pdf-wfg1.mjs
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

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
const RACINE = "/home/wfg/imports/pages";

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
  supabase.from("project_files").select("legacy_id").eq("kind", "moodboard").order("id"),
);
const dejaPoses = new Set(existants.map((f) => f.legacy_id).filter(Boolean));

let nDeposees = 0, nDeja = 0, nSansFiche = 0, nEchouees = 0;
const touches = new Set();

for (const compte of readdirSync(RACINE).filter((c) => /^\d+$/.test(c))) {
  for (const projetWfg1 of readdirSync(join(RACINE, compte)).filter((p) => /^\d+$/.test(p))) {
    const dossier = join(RACINE, compte, projetWfg1, "docs");
    if (!existsSync(dossier)) continue;
    const projet = parLegacyId.get(projetWfg1);
    const fichiers = readdirSync(dossier).filter((f) => /\.jpg$/i.test(f)).sort();
    if (!projet) { nSansFiche += fichiers.length; continue; }
    for (const fichier of fichiers) {
      const m = fichier.match(/^(.*)-0*(\d+)\.jpg$/i);
      if (!m) continue;
      const legacyId = `docs/${compte}/${projetWfg1}/${m[1]}.pdf#${m[2]}`;
      if (dejaPoses.has(legacyId)) { nDeja++; continue; }
      try {
        const donnees = readFileSync(join(dossier, fichier));
        const chemin = `${projet.owner_id}/${projet.id}-moodboard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const { error } = await supabase.storage.from("project-media").upload(chemin, donnees, { contentType: "image/jpeg" });
        if (error) throw error;
        const { error: err2 } = await supabase.from("project_files").insert({
          project_id: projet.id, storage_path: chemin, kind: "moodboard",
          original_name: `${m[1]}.pdf (page ${m[2]})`, legacy_id: legacyId,
        });
        if (err2) throw err2;
        nDeposees++;
        touches.add(projet.id);
        dejaPoses.add(legacyId);
      } catch (e) {
        nEchouees++;
        console.error(legacyId, e.message ?? e);
      }
    }
  }
}
console.log(`pages : ${nDeposees} déposées sur ${touches.size} fiches, ${nDeja} déjà présentes, ${nSansFiche} sans fiche WFG 2, ${nEchouees} échouées`);
