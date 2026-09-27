// Calcule le vecteur de sens des mots-clés qui n'en ont pas encore
// (colonne keywords.vecteur, migration 0096), par lots, avec le modèle
// installé sur le serveur (src/lib/vecteurs.ts). Idempotent : à relancer
// quand de nouveaux mots-clés apparaissent (le rattrapage horaire le fait
// aussi). Lancement : node scripts/vectoriser-mots-cles.mjs
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
  const { data: lot, error } = await supabase.rpc("mots_cles_sans_vecteur", { p_limite: 200 });
  if (error) throw error;
  if (!lot?.length) break;
  const sortie = await ext(lot.map((m) => m.label_fr), { pooling: "mean", normalize: true });
  const vecteurs = sortie.tolist();
  for (let i = 0; i < lot.length; i++) {
    const { error: e } = await supabase
      .from("keywords")
      .update({ vecteur: `[${vecteurs[i].map((x) => x.toFixed(6)).join(",")}]` })
      .eq("id", lot[i].id);
    if (e) throw e;
  }
  faits += lot.length;
  console.log(`… ${faits} mots-clés vectorisés`);
}
console.log(`terminé : ${faits} mots-clés vectorisés`);
