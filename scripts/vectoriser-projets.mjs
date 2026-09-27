// Calcule le vecteur de sens des fiches projet (titre, tagline, logline)
// qui n'en ont pas, ou dont le texte a changé (migration 0097). Idempotent.
// Lancement : node scripts/vectoriser-projets.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { env, pipeline } from "@huggingface/transformers";

const conf = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const supabase = createClient(conf.NEXT_PUBLIC_SUPABASE_URL, conf.SUPABASE_SERVICE_ROLE_KEY);
env.cacheDir = `${process.env.HOME}/.cache/modeles`;
const ext = await pipeline("feature-extraction", "Xenova/paraphrase-multilingual-MiniLM-L12-v2", { dtype: "q8" });

let faits = 0;
for (;;) {
  const { data: lot, error } = await supabase.rpc("projets_sans_vecteur", { p_limite: 100 });
  if (error) throw error;
  if (!lot?.length) break;
  const sortie = await ext(lot.map((p) => p.texte), { pooling: "mean", normalize: true });
  const vecteurs = sortie.tolist();
  for (let i = 0; i < lot.length; i++) {
    const { error: e } = await supabase
      .from("projects")
      .update({ vecteur: `[${vecteurs[i].map((x) => x.toFixed(6)).join(",")}]`, vecteur_empreinte: lot[i].empreinte })
      .eq("id", lot[i].id);
    if (e) throw e;
  }
  faits += lot.length;
  if (faits % 1000 === 0) console.log(`… ${faits} fiches`);
}
console.log(`terminé : ${faits} fiches vectorisées`);
