// Après ~/imports/compresser-tout.sh : remplace dans le stockage chaque
// PDF rattaché depuis WFG 1 (project_files.legacy_id « docs/… ») par sa
// version allégée, au même chemin. Idempotent : un fichier dont la
// taille en stockage est déjà celle du fichier local n'est pas renvoyé.
// Les tailles en stockage sont lues d'un export psql (storage.objects
// n'est pas joignable par l'API) : ~/imports/tailles-stockage.tsv, à
// régénérer avant chaque lancement :
//   docker exec supabase-db psql -U postgres -d postgres -Atc "select name || E'\t' || coalesce((metadata->>'size'),'') from storage.objects where bucket_id='scenarios';" > ~/imports/tailles-stockage.tsv
// Un document annexe (kind « document ») vit sous <compte>/<projet>/docs/,
// alors que son legacy_id ne garde pas ce sous-dossier.
import { existsSync, readFileSync, statSync } from "node:fs";
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
const RACINE = "/home/wfg/imports/docs";

async function toutLire(construire) {
  const tout = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await construire().range(debut, debut + 999);
    if (error) throw error;
    tout.push(...data);
    if (data.length < 1000) return tout;
  }
}

const tailles = new Map(
  readFileSync("/home/wfg/imports/tailles-stockage.tsv", "utf8").split("\n").filter(Boolean).map((l) => {
    const [nom, taille] = l.split("\t");
    return [nom, Number(taille)];
  }),
);
const lignes = await toutLire(() =>
  supabase.from("project_files").select("id, storage_path, legacy_id, kind").like("legacy_id", "docs/%").in("kind", ["scenario", "document"]).order("id"),
);
let remplaces = 0, dejaBons = 0, nonAlleges = 0, echoues = 0, avant = 0, apres = 0;
for (const l of lignes) {
  const relatif = l.legacy_id.replace(/^docs\//, "");
  const local = l.kind === "document" ? join(RACINE, relatif.replace(/\/([^/]+)$/, "/docs/$1")) : join(RACINE, relatif);
  if (!existsSync(`${local}.orig.pdf`)) { nonAlleges++; continue; } // jamais allégé (ou gardé tel quel)
  const tailleOrig = statSync(`${local}.orig.pdf`).size;
  const taille = statSync(local).size;
  // La taille en stockage : celle de l'objet ; si elle vaut déjà la
  // taille locale, c'est fait.
  if (tailles.get(l.storage_path) === taille) { dejaBons++; continue; }
  try {
    const { error } = await supabase.storage.from("scenarios").upload(l.storage_path, readFileSync(local), { contentType: "application/pdf", upsert: true });
    if (error) throw error;
    remplaces++; avant += tailleOrig; apres += taille;
  } catch (e) {
    echoues++;
    console.error("remplacement", l.legacy_id, e.message ?? e);
  }
  if ((remplaces + dejaBons + echoues) % 500 === 0) console.log(`… ${remplaces} remplacés`);
}
const mo = (n) => Math.round(n / 1048576);
console.log(`remplacés : ${remplaces} (${mo(avant)} Mo -> ${mo(apres)} Mo), déjà faits : ${dejaBons}, jamais allégés : ${nonAlleges}, échoués : ${echoues}`);
