// Retire les documents annexes rattachés par erreur depuis les originaux
// gardés par l'allègement (legacy_id se terminant par « .orig.pdf ») :
// l'objet dans le stockage, puis la ligne project_files.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const lignes = [];
for (let debut = 0; ; debut += 1000) {
  const { data, error } = await supabase.from("project_files").select("id, storage_path").like("legacy_id", "%.orig.pdf").order("id").range(debut, debut + 999);
  if (error) throw error;
  lignes.push(...data);
  if (data.length < 1000) break;
}
let retires = 0, echoues = 0;
for (let i = 0; i < lignes.length; i += 100) {
  const lot = lignes.slice(i, i + 100);
  const { error } = await supabase.storage.from("scenarios").remove(lot.map((l) => l.storage_path));
  if (error) { echoues += lot.length; console.error(error.message); continue; }
  const { error: err2 } = await supabase.from("project_files").delete().in("id", lot.map((l) => l.id));
  if (err2) { echoues += lot.length; console.error(err2.message); continue; }
  retires += lot.length;
}
console.log(`doublons retirés : ${retires}, échoués : ${echoues}`);
