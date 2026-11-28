// Rapproche les films de Dames des vues (Réalisatrices Équitables) des
// projets WFG par le sens (28/11, Sarah) : même modèle que les Galaxies.
// Entrées : ~/imports/realisatrices-equitables/films.json et projets_wfg.json
// Sortie : ~/imports/realisatrices-equitables/rapprochements.json
// Lancement : node scripts/rapprocher-dames-des-vues.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { env, pipeline } from "@huggingface/transformers";

const D = `${process.env.HOME}/imports/realisatrices-equitables`;
env.cacheDir = `${process.env.HOME}/.cache/modeles`;
const ext = await pipeline("feature-extraction", "Xenova/paraphrase-multilingual-MiniLM-L12-v2", { dtype: "q8" });

const films = JSON.parse(readFileSync(`${D}/films.json`, "utf8"))
  .filter((f) => f.realisatrices[0] !== "" && !f.url_slug.endsWith("-en"));
const projets = JSON.parse(readFileSync(`${D}/projets_wfg.json`, "utf8"))
  .filter((p) => p.v)
  .map((p) => ({ ...p, v: Float32Array.from(JSON.parse(p.v)) }));

const resume = (f) => {
  let s = f.synopsis;
  for (const m of f.meta) if (s.startsWith(m)) s = s.slice(m.length).trim();
  return s.startsWith("DAMES DES VUES") ? "" : s;
};

const sortie = [];
for (let i = 0; i < films.length; i += 64) {
  const lot = films.slice(i, i + 64);
  const textes = lot.map((f) => [f.titre, resume(f), f.themes.join(", ")].filter(Boolean).join(". "));
  const vs = (await ext(textes, { pooling: "mean", normalize: true })).tolist();
  lot.forEach((f, k) => {
    const v = vs[k];
    const scores = projets.map((p) => {
      let s = 0;
      for (let j = 0; j < v.length; j++) s += v[j] * p.v[j];
      return [s, p.id];
    });
    scores.sort((a, b) => b[0] - a[0]);
    sortie.push({ ...f, resume: resume(f), proches: scores.slice(0, 5).map(([s, id]) => ({ id, s: +s.toFixed(3) })) });
  });
  console.log(`… ${Math.min(i + 64, films.length)} / ${films.length}`);
}
writeFileSync(`${D}/rapprochements.json`, JSON.stringify(sortie));
console.log("terminé");
