// Classeur récapitulatif des films du CNC pour Sarah : ~/exports/Films du CNC 2001-2025 — devis, financement, entrées (JJ-MM).xlsx
// Feuilles : Récapitulatif par année, Films (tous), Films non rapprochés (sans entrées).
// Usage : node scripts/exporter-films-cnc.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { connexion, toutLire } from "./films-cnc-outils.mjs";

const supabase = connexion();
const films = await toutLire(() => supabase.from("films_cnc").select("*").order("annee_agrement").order("titre").order("id"));
const mediane = (t) => {
  const s = t.filter((x) => x != null).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : null;
};

const annees = [...new Set(films.map((f) => f.annee_agrement))];
const recap = annees.map((a) => {
  const fa = films.filter((f) => f.annee_agrement === a);
  const avecEntrees = fa.filter((f) => f.entrees_france != null);
  return [
    a, fa.length, fa.filter((f) => f.devis).length, mediane(fa.map((f) => f.devis)),
    fa.filter((f) => f.initiative_francaise).length, fa.filter((f) => f.premier_film).length,
    avecEntrees.length, fa.filter((f) => f.lumiere_id).length, fa.length - fa.filter((f) => f.lumiere_id).length,
    fa.filter((f) => f.lumiere_id).length ? Math.round((100 * avecEntrees.length) / fa.length) : null,
    mediane(avecEntrees.map((f) => f.entrees_france)),
  ];
});
const total = ["Total", films.length, films.filter((f) => f.devis).length, mediane(films.map((f) => f.devis)),
  films.filter((f) => f.initiative_francaise).length, films.filter((f) => f.premier_film).length,
  films.filter((f) => f.entrees_france != null).length, films.filter((f) => f.lumiere_id).length,
  films.filter((f) => !f.lumiere_id).length, Math.round((100 * films.filter((f) => f.entrees_france != null).length) / films.length),
  mediane(films.filter((f) => f.entrees_france != null).map((f) => f.entrees_france))];

const colonnesFilms = ["Année d'agrément", "Visa", "Titre", "Réalisateur", "Producteurs délégués", "Devis (€)", "Genre", "Initiative française", "Rang du réalisateur", "Premier film", "Bonus parité",
  "Avance sur recettes", "Chaînes payantes", "Chaînes en clair", "Sofica", "Crédit d'impôt", "Aide régionale", "Part française (%)", "Pays et parts", "Entrées en France", "Année de sortie", "Source des entrées"];
const ligneFilm = (f) => [f.annee_agrement, f.visa, f.titre, f.realisateur, f.producteurs_delegues, f.devis, f.genre, f.initiative_francaise, f.rang_realisateur, f.premier_film, f.bonus_parite,
  f.avance_sur_recettes, f.chaines_payantes, f.chaines_clair, f.sofica, f.credit_impot, f.aide_regionale, f.part_francaise,
  (f.nationalites || []).map((n) => `${n.pays} ${n.part}`).join(" / "), f.entrees_france, f.annee_sortie, f.source_entrees];
const largeursFilms = [10, 9, 38, 30, 34, 13, 13, 10, 10, 8, 8, 10, 22, 22, 7, 8, 8, 9, 40, 13, 9, 50];
const sansEntrees = films.filter((f) => f.entrees_france == null);

const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }).replace("/", "-");
const sortie = `/home/wfg/exports/Films du CNC 2001-2025 — devis, financement, entrées (${date}).xlsx`;
const json = "/home/wfg/imports/cnc/export-films-cnc.json";
writeFileSync(json, JSON.stringify({ feuilles: [
  { nom: "Récapitulatif", colonnes: ["Année d'agrément", "Films agréés", "Avec devis", "Devis médian (€)", "Initiative française", "Premiers films", "Avec entrées en France", "Retrouvés dans LUMIERE", "Non retrouvés", "% avec entrées", "Entrées médianes"], lignes: [...recap, total], largeurs: [16, 13, 11, 16, 18, 13, 20, 20, 14, 13, 15] },
  { nom: "Films", colonnes: colonnesFilms, lignes: films.map(ligneFilm), largeurs: largeursFilms },
  { nom: "Sans entrées", colonnes: colonnesFilms, lignes: sansEntrees.map(ligneFilm), largeurs: largeursFilms },
] }));
execFileSync("python3", ["-I", new URL("./ecrire-xlsx-feuilles.py", import.meta.url).pathname, sortie, json], { stdio: "inherit" });
console.log(sortie);
