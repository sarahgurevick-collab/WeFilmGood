// Remplace, sur WFG 2, le scénario d'un projet de WFG 1 renvoyé à la lecture
// par sa nouvelle version (15/11/2026). La reprise des documents ne remplace
// jamais un scénario déjà présent ; or un auteur qui renvoie son projet sur
// WFG 1 y dépose sa version retravaillée, et c'est elle que le lecteur doit
// lire (Sarah, 11/11 : la version donnée à la lecture « est destinée à être
// écrasée par la nouvelle version retravaillée »).
// L'ancienne version est d'abord gardée dans <dossier>/avant/.
//   node scripts/remplacer-scenarios-relecture.mjs <dossier> [--ecrire]
// <dossier> contient un fichier <n° du projet sur WFG 1>.pdf par projet.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const dossier = process.argv[2];
const ECRIRE = process.argv.includes("--ecrire");
if (!dossier) { console.error("Il faut le dossier des nouveaux scénarios."); process.exit(1); }
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
mkdirSync(join(dossier, "avant"), { recursive: true });

for (const nom of readdirSync(dossier).filter((f) => /^\d+\.pdf$/.test(f)).sort()) {
  const legacy = nom.replace(".pdf", "");
  const { data: projet } = await supabase.from("projects").select("id, title").eq("legacy_id", legacy).maybeSingle();
  if (!projet) { console.log(`! ${legacy} : projet introuvable sur WFG 2`); continue; }
  const { data: fichiers } = await supabase.from("project_files").select("id, storage_path").eq("project_id", projet.id).eq("kind", "scenario");
  if (fichiers?.length !== 1) { console.log(`! ${legacy} « ${projet.title} » : ${fichiers?.length ?? 0} scénario(s), laissé`); continue; }
  const nouveau = readFileSync(join(dossier, nom));
  const { data: ancien, error: e1 } = await supabase.storage.from("scenarios").download(fichiers[0].storage_path);
  if (e1) { console.log(`! ${legacy} : lecture de l'ancien impossible (${e1.message})`); continue; }
  const avant = Buffer.from(await ancien.arrayBuffer());
  console.log(`${legacy} « ${projet.title} » : ${avant.length} → ${nouveau.length} octets${ECRIRE ? "" : " (aperçu)"}`);
  if (!ECRIRE) continue;
  writeFileSync(join(dossier, "avant", nom), avant);
  const { error: e2 } = await supabase.storage.from("scenarios").update(fichiers[0].storage_path, nouveau, { contentType: "application/pdf", upsert: true });
  if (e2) { console.log(`! ${legacy} : remplacement refusé (${e2.message})`); continue; }
  await supabase.from("project_files").update({ uploaded_at: new Date().toISOString() }).eq("id", fichiers[0].id);
}
