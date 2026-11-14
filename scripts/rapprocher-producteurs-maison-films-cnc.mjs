// Sarah, 14/11/2026 : « Au vu des datas du CNC, c'est le nom de société qu'on
// devrait mentionner. […] "Les Producteurs qui nous font confiance" ».
// Compare, SANS RIEN MODIFIER, les sociétés de la page /association
// (src/data/association.ts, PRODUCTEURS) aux producteurs délégués des films
// agréés par le CNC (table films_cnc, 2001-2025). Sortie : classeur dans
// ~/exports. Les noms sont rapprochés sans les mots « Films », « Production »,
// « SARL »… : chaque rapprochement reste à vérifier.
// Usage : node scripts/rapprocher-producteurs-maison-films-cnc.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { connexion, toutLire } from "./films-cnc-outils.mjs";

const src = readFileSync(new URL("../src/data/association.ts", import.meta.url), "utf8");
const debut = src.indexOf("export const PRODUCTEURS");
const bloc = src.slice(debut, src.indexOf("\n];", debut));
const societes = [...bloc.matchAll(/nom:\s*"([^"]+)"/g)].map((m) => m[1]);

const cle = (s) =>
  String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " et ").replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(sarl|sas|sa|eurl|inc|ltd|gmbh|srl|scop|societe|ste)\b/g, " ")
    .replace(/\b(productions?|prod|films?|cinema|pictures?|les|la|le|the)\b/g, " ")
    .replace(/\s+/g, " ").trim();

const base = connexion();
const films = await toutLire(() =>
  base.from("films_cnc").select("visa, annee_agrement, annee_sortie, titre, realisateur, producteurs_delegues, genre").order("id"));
const parSociete = new Map();
for (const f of films) {
  for (const p of String(f.producteurs_delegues || "").split(/\s*\/\s*/)) {
    const c = cle(p);
    if (c) parSociete.set(c, [...(parSociete.get(c) ?? []), { ...f, ecrit: p }]);
  }
}

const resume = [];
const detail = [];
for (const nom of societes) {
  const c = cle(nom);
  const siens = c.length >= 3 ? parSociete.get(c) ?? [] : [];
  const annees = siens.map((f) => f.annee_agrement);
  resume.push([
    nom, siens.length, siens.length ? Math.min(...annees) : "", siens.length ? Math.max(...annees) : "",
    [...new Set(siens.map((f) => f.ecrit))].join(" | "),
  ]);
  for (const f of siens) detail.push([nom, f.titre, f.annee_agrement, f.annee_sortie, f.visa, f.realisateur, f.producteurs_delegues, f.genre]);
}
resume.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
detail.sort((a, b) => a[0].localeCompare(b[0]) || b[2] - a[2]);

const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }).replace("/", "-");
const sortie = `/home/wfg/exports/Producteurs qui nous font confiance — leurs films au CNC (${date}).xlsx`;
const json = "/home/wfg/imports/cnc/rapprochement-producteurs-maison.json";
writeFileSync(json, JSON.stringify({ feuilles: [
  { nom: "Sociétés", colonnes: ["Société (liste de la Maison)", "Films agréés CNC", "Premier agrément", "Dernier agrément", "Écrit ainsi au CNC"], largeurs: [38, 16, 16, 16, 60], lignes: resume },
  { nom: "Films", colonnes: ["Société (liste de la Maison)", "Film", "Agrément", "Sortie", "Visa", "Réalisateur", "Producteurs délégués (CNC)", "Genre"], largeurs: [34, 38, 10, 9, 10, 30, 50, 13], lignes: detail },
] }));
execFileSync("python3", ["-I", new URL("./ecrire-xlsx-feuilles.py", import.meta.url).pathname, sortie, json], { stdio: "inherit" });
console.log(sortie, "|", societes.length, "sociétés,", resume.filter((l) => l[1] > 0).length, "retrouvées,", new Set(detail.map((l) => l[4])).size, "films");
