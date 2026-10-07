// Les fichiers de WFG 1 dont le nom a perdu son extension (« …pdf » collé,
// sans point : 20 fichiers), ignorés par importer-docs-wfg1.mjs. Repérés le
// 07/10/2026 sur « Les Feuilles mortes » (n° 2695). Les PDF sans texte
// (moodboards) sont passés par importer-pages-pdf-wfg1.mjs ; ici :
//  - les 2 images PNG sans extension → photos du Moodboard ;
//  - les PDF avec du texte → documents annexes (kind « document »).
// Idempotent (legacy_id). Lancement : node scripts/importer-sans-extension-wfg1.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const RACINE = "/home/wfg/imports/docs";

const IMAGES = ["5493/3014/docs/capturedecran20200606a200503pdf", "5493/3014/docs/vspdf"];
const DOCUMENTS = [
  "2354/1323/docs/aprespdf",
  "43/34/docs/dossiertestojbrondoniresidencesofilm2020glisseespdf",
  "4358/2512/docs/kingsonpressinfov1pdf",
  "443/2448/docs/ledernierclientartworksetinfluencesvisuellesemmanueldehaenewfgpdf",
  "4750/2695/docs/treatmentfirsttimeeverisawyourfacepdf",
  "5020/2926/docs/notedintentionconvertifusionnepdf",
];

async function projetDe(chemin) {
  const legacy = chemin.split("/")[1];
  const { data } = await supabase.from("projects").select("id, owner_id").eq("legacy_id", legacy).maybeSingle();
  return data;
}
async function dejaLa(projectId, legacyId) {
  const { data } = await supabase.from("project_files").select("id").eq("project_id", projectId).eq("legacy_id", legacyId).limit(1);
  return (data ?? []).length > 0;
}

for (const f of IMAGES) {
  const projet = await projetDe(f);
  const legacyId = `docs/${f.split("/")[0]}/${f.split("/")[1]}/${f.split("/")[3]}`;
  if (!projet) { console.log("sans fiche :", f); continue; }
  if (await dejaLa(projet.id, legacyId)) { console.log("déjà là :", f); continue; }
  const donnees = await sharp(`${RACINE}/${f}`, { failOn: "none" }).rotate()
    .resize({ width: 1600, withoutEnlargement: true }).flatten({ background: "#fff" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  const chemin = `${projet.owner_id}/${projet.id}-moodboard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { error } = await supabase.storage.from("project-media").upload(chemin, donnees, { contentType: "image/jpeg" });
  if (error) throw error;
  const { error: e2 } = await supabase.from("project_files").insert({
    project_id: projet.id, storage_path: chemin, kind: "moodboard", original_name: f.split("/")[3], legacy_id: legacyId,
  });
  if (e2) throw e2;
  console.log("photo posée :", f);
}

for (const f of DOCUMENTS) {
  const projet = await projetDe(f);
  const nom = f.split("/")[3].replace(/pdf$/, "") + ".pdf";
  const legacyId = `docs/${f.split("/")[0]}/${f.split("/")[1]}/${f.split("/")[3]}`;
  if (!projet) { console.log("sans fiche :", f); continue; }
  if (await dejaLa(projet.id, legacyId)) { console.log("déjà là :", f); continue; }
  const chemin = `${projet.owner_id}/${projet.id}-document-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
  const { error } = await supabase.storage.from("scenarios").upload(chemin, readFileSync(`${RACINE}/${f}`), { contentType: "application/pdf" });
  if (error) throw error;
  const { error: e2 } = await supabase.from("project_files").insert({
    project_id: projet.id, storage_path: chemin, kind: "document", original_name: nom, legacy_id: legacyId,
  });
  if (e2) throw e2;
  console.log("document posé :", nom);
}
