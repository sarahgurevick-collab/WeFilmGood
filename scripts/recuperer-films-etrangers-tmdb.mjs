#!/usr/bin/env node
// Films étrangers pour « Films proches » (demande de Sarah, 21/11/2026) :
// récupère sur TMDB les films non francophones sortis de 2001 à 2025 — les
// plus vus et les mieux notés — avec leur résumé en français, leur
// réalisateur et leur pays, et les écrit dans un fichier JSON hors du dépôt.
//
//   node scripts/recuperer-films-etrangers-tmdb.mjs <sortie.json> [combien=5000] [deja.json] [recents|anciens]
//
// « anciens » (seconde vague, 21/11/2026) : les films d'avant 2001, français
// compris (le CNC ne commence qu'en 2001), avec une part réservée aux films
// non anglophones — la première vague était à 83 % en anglais.
//
// deja.json : tableau des identifiants TMDB déjà dans la base (à écarter).
// Clé : TMDB_READ_TOKEN dans .env.local (usage gratuit non commercial).
import { readFileSync, writeFileSync } from "node:fs";

const [sortie, combienTxt = "5000", dejaChemin, vague = "recents"] = process.argv.slice(2);
const anciens = vague === "anciens" || vague === "anciens2";
const seuilBas = vague === "anciens2"; // troisième vague (22/11) : seuils de votes plus bas
const combien = Number(combienTxt);
const jeton = readFileSync(new URL("../.env.local", import.meta.url), "utf8").match(/^TMDB_READ_TOKEN=(.+)$/m)[1].trim();
const deja = new Set(dejaChemin ? JSON.parse(readFileSync(dejaChemin, "utf8")) : []);

async function tmdb(chemin) {
  for (let essai = 0; ; essai++) {
    const r = await fetch(`https://api.themoviedb.org/3${chemin}`, { headers: { Authorization: `Bearer ${jeton}` } });
    if (r.ok) return r.json();
    if (r.status === 404) return null;
    if (essai >= 5) throw new Error(`${r.status} ${chemin}`);
    await new Promise((f) => setTimeout(f, 1500 * (essai + 1)));
  }
}
async function parPaquets(liste, taille, fn) {
  const res = [];
  for (let i = 0; i < liste.length; i += taille) res.push(...(await Promise.all(liste.slice(i, i + taille).map(fn))));
  return res;
}

const dates = anciens
  ? "primary_release_date.lte=2000-12-31&language=fr-FR"
  : "primary_release_date.gte=2001-01-01&primary_release_date.lte=2025-12-31&without_original_language=fr&language=fr-FR";
const listes = seuilBas
  ? [
      { tri: `sort_by=vote_count.desc&vote_count.gte=15&${dates}`, pages: 500 },
      { tri: `sort_by=vote_average.desc&vote_count.gte=40&${dates}`, pages: 300 },
      { tri: `sort_by=vote_count.desc&vote_count.gte=8&without_original_language=en&${dates}`, pages: 400 },
      { tri: `sort_by=vote_average.desc&vote_count.gte=20&without_original_language=en&${dates}`, pages: 300 },
    ]
  : anciens
  ? [
      { tri: `sort_by=vote_count.desc&vote_count.gte=80&${dates}`, pages: 250 },
      { tri: `sort_by=vote_average.desc&vote_count.gte=200&${dates}`, pages: 150 },
      // deux listes sur quatre hors anglais : les plus vus, puis les mieux notés
      { tri: `sort_by=vote_count.desc&vote_count.gte=30&without_original_language=en&${dates}`, pages: 200 },
      { tri: `sort_by=vote_average.desc&vote_count.gte=60&without_original_language=en&${dates}`, pages: 150 },
    ]
  : [
      { tri: `sort_by=vote_count.desc&vote_count.gte=150&${dates}`, pages: 330 },
      { tri: `sort_by=vote_average.desc&vote_count.gte=300&${dates}`, pages: 200 },
    ];
const rangs = [];
for (const l of listes) {
  const pages = await parPaquets(Array.from({ length: l.pages }, (_, i) => i + 1), 10, (p) => tmdb(`/discover/movie?${l.tri}&page=${p}`));
  rangs.push(pages.flatMap((p) => p?.results ?? []));
}
// une de chaque liste tour à tour : les plus vus et les mieux notés avancent ensemble
const retenus = new Map();
for (let i = 0; retenus.size < combien && rangs.some((r) => i < r.length); i++) {
  for (const r of rangs) {
    const f = r[i];
    if (!f || retenus.has(f.id) || deja.has(f.id) || (!anciens && f.original_language === "fr")) continue;
    if ((f.overview ?? "").trim().length < 80) continue;
    if (retenus.size < combien) retenus.set(f.id, f);
  }
}
console.error(`${retenus.size} films retenus, détails en cours…`);

const GENRES = { 99: "documentaire", 16: "animation" };
const films = await parPaquets([...retenus.values()], 12, async (f) => {
  const d = await tmdb(`/movie/${f.id}?language=fr-FR&append_to_response=credits`);
  if (!d) return null;
  const pays = (d.production_countries ?? []).map((p) => p.iso_3166_1);
  if (!anciens && pays[0] === "FR") return null; // film d'abord français : déjà couvert par le CNC
  return {
    tmdb: f.id,
    titre: d.title,
    titre_original: d.original_title,
    langue: d.original_language,
    annee: Number((d.release_date || f.release_date || "").slice(0, 4)) || null,
    realisateur: (d.credits?.crew ?? []).filter((c) => c.job === "Director").map((c) => c.name).join(", ") || null,
    pays: pays.join(", ") || null, // codes ISO (US, GB…), le nom français est écrit à l'affichage
    genre: (d.genres ?? []).map((g) => GENRES[g.id]).find(Boolean) ?? "fiction",
    genres_tmdb: (d.genres ?? []).map((g) => g.name),
    duree: d.runtime || null,
    resume: (d.overview || f.overview).trim(),
    votes: d.vote_count,
    note: d.vote_average,
  };
});
const bons = films.filter(Boolean);
writeFileSync(sortie, JSON.stringify(bons, null, 0));
console.error(`${bons.length} films écrits dans ${sortie}`);
