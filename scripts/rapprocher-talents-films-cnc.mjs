// Sarah, 14/11/2026 : « je pense qu'il y a des films tournés mais je ne le
// sais pas. Parfois le titre change. Si tu compares les talents sur WFG et la
// liste des noms sur le site du CNC […] je pourrais les retrouver. »
// Rapproche, SANS RIEN MODIFIER dans la base, les films agréés par le CNC
// (table films_cnc, 2001-2025, avec leur numéro de visa) :
//   1. des talents de WFG qui portent le nom d'un réalisateur de la liste ;
//   2. des projets de WFG qui portent le titre d'un film de la liste.
// Sortie : un classeur dans ~/exports, à vérifier à la main (homonymes).
// Limite : la liste du CNC ne donne que le réalisateur et le producteur
// délégué — pas les scénaristes.
// Usage : node scripts/rapprocher-talents-films-cnc.mjs
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { normaliserTitre, connexion, toutLire } from "./films-cnc-outils.mjs";

const base = connexion();
const simple = (s) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
// « DELEUZE Emilie » et « Émilie Deleuze » donnent la même clé.
const cleNom = (s) => simple(s).split(" ").filter(Boolean).sort().join(" ");

const films = await toutLire(() =>
  base.from("films_cnc").select("visa, annee_agrement, annee_sortie, titre, titre_normalise, realisateur, producteurs_delegues, genre").order("id"));
const profils = await toutLire(() =>
  base.from("profiles").select("id, first_name, last_name, category, anonymized_at, departed_at").order("id"));
const projets = await toutLire(() =>
  base.from("projects").select("id, owner_id, title, ancien_titre, format, bandeau, is_public").order("id"));
const coauteurs = await toutLire(() =>
  base.from("project_co_authors").select("project_id, profile_id, status").not("profile_id", "is", null).order("id"));
const roles = await toutLire(() => base.from("profile_roles").select("profile_id, role_slug").order("profile_id"));

const metiers = new Map();
for (const r of roles) metiers.set(r.profile_id, [...(metiers.get(r.profile_id) ?? []), r.role_slug]);
const profil = new Map(profils.map((p) => [p.id, p]));
const nomDe = (id) => {
  const p = profil.get(id);
  return p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : "";
};

// Les talents par clé de nom (prénom + nom tous deux renseignés).
const parNom = new Map();
for (const p of profils) {
  if (p.anonymized_at || p.departed_at || !simple(p.first_name) || !simple(p.last_name)) continue;
  const c = cleNom(`${p.first_name} ${p.last_name}`);
  parNom.set(c, [...(parNom.get(c) ?? []), p]);
}
// Les projets de chaque talent (porteur ou coauteur).
const projetsDe = new Map();
const ajouter = (id, pr) => projetsDe.set(id, [...(projetsDe.get(id) ?? []), pr]);
const projet = new Map(projets.map((p) => [p.id, p]));
for (const p of projets) if (p.owner_id) ajouter(p.owner_id, p);
for (const c of coauteurs) if (projet.has(c.project_id)) ajouter(c.profile_id, projet.get(c.project_id));
const equipe = new Map();
for (const p of projets) equipe.set(p.id, new Set([p.owner_id].filter(Boolean)));
for (const c of coauteurs) equipe.get(c.project_id)?.add(c.profile_id);

const realisateurs = (f) => String(f.realisateur || "").split(/\s*\/\s*/).filter(Boolean);
const titresDe = (p) => [p.title, p.ancien_titre].filter(Boolean).map(normaliserTitre).filter(Boolean);

// 1. Talents qui portent le nom d'un réalisateur.
const lignesTalents = [];
for (const f of films) {
  for (const r of realisateurs(f)) {
    for (const p of parNom.get(cleNom(r)) ?? []) {
      const siens = projetsDe.get(p.id) ?? [];
      const meme = siens.find((pr) => titresDe(pr).includes(f.titre_normalise));
      const m = metiers.get(p.id) ?? [];
      const indice = meme ? "1 - même titre sur WFG" : m.includes("realisateur") ? "2 - réalisateur sur WFG" : "3 - même nom seulement";
      lignesTalents.push([
        indice, nomDe(p.id), m.join(", "), f.titre, f.annee_agrement, f.annee_sortie, f.visa, r, f.producteurs_delegues, f.genre,
        meme ? meme.title : "", meme ? (meme.bandeau ?? "") : "",
        [...new Set(siens.map((pr) => pr.title))].slice(0, 12).join(" ; "),
        `https://app.wefilmgood.com/membres/${p.id}`,
      ]);
    }
  }
}
lignesTalents.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]) || a[4] - b[4]);

// 2. Projets qui portent le titre d'un film.
const parTitre = new Map();
for (const f of films) parTitre.set(f.titre_normalise, [...(parTitre.get(f.titre_normalise) ?? []), f]);
const lignesProjets = [];
for (const p of projets) {
  for (const t of new Set(titresDe(p))) {
    for (const f of parTitre.get(t) ?? []) {
      const cles = new Set(realisateurs(f).map(cleNom));
      const membres = [...(equipe.get(p.id) ?? [])];
      const dansEquipe = membres.find((id) => cles.has(cleNom(nomDe(id))));
      // Un titre d'un seul mot court (« Elle », « Lola ») ne prouve rien.
      const distinctif = t.split(" ").length >= 3 || t.length >= 14;
      const indice = dansEquipe ? "1 - réalisateur dans l'équipe WFG" : distinctif ? "2 - titre peu courant" : "3 - titre courant";
      lignesProjets.push([
        indice, p.title, p.ancien_titre ?? "", p.format ?? "", p.bandeau ?? "", nomDe(p.owner_id),
        f.titre, f.annee_agrement, f.annee_sortie, f.visa, f.realisateur, f.producteurs_delegues, f.genre,
        `https://app.wefilmgood.com/projet/${p.id}`,
      ]);
    }
  }
}
lignesProjets.sort((a, b) => a[0].localeCompare(b[0]) || String(a[1]).localeCompare(String(b[1])));

const compter = (lignes) => Object.entries(lignes.reduce((t, l) => ((t[l[0]] = (t[l[0]] ?? 0) + 1), t), {})).sort();
const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }).replace("/", "-");
const sortie = `/home/wfg/exports/Films du CNC — talents et projets WFG retrouvés (${date}).xlsx`;
const json = "/home/wfg/imports/cnc/rapprochement-talents-films.json";
writeFileSync(json, JSON.stringify({ feuilles: [
  { nom: "À lire", colonnes: ["Ce classeur", ""], largeurs: [70, 14], lignes: [
    ["Films agréés par le CNC (2001-2025) comparés aux talents et aux projets de WFG. Rien n'a été modifié sur le site.", ""],
    ["La liste du CNC ne donne que le réalisateur et le producteur délégué : les scénaristes n'y sont pas.", ""],
    ["Un même nom ne prouve pas que c'est la même personne (homonymes) : chaque ligne est à vérifier.", ""],
    ["", ""],
    ["Feuille « Talents réalisateurs » — lignes", lignesTalents.length],
    ...compter(lignesTalents).map(([k, n]) => [`   ${k}`, n]),
    ["   talents différents", new Set(lignesTalents.map((l) => l[13])).size],
    ["Feuille « Projets par le titre » — lignes", lignesProjets.length],
    ...compter(lignesProjets).map(([k, n]) => [`   ${k}`, n]),
  ] },
  { nom: "Talents réalisateurs", largeurs: [26, 26, 30, 34, 9, 9, 10, 26, 34, 13, 30, 12, 60, 50],
    colonnes: ["Indice", "Talent WFG", "Métiers sur WFG", "Film (CNC)", "Agrément", "Sortie", "Visa", "Réalisateur (CNC)", "Producteur délégué (CNC)", "Genre", "Projet WFG du même titre", "Bandeau actuel", "Ses projets sur WFG", "Profil"],
    lignes: lignesTalents },
  { nom: "Projets par le titre", largeurs: [30, 34, 26, 15, 12, 26, 34, 9, 9, 10, 28, 34, 13, 50],
    colonnes: ["Indice", "Projet WFG", "Ancien titre", "Format", "Bandeau actuel", "Porteur", "Film (CNC)", "Agrément", "Sortie", "Visa", "Réalisateur (CNC)", "Producteur délégué (CNC)", "Genre", "Fiche projet"],
    lignes: lignesProjets },
] }));
execFileSync("python3", ["-I", new URL("./ecrire-xlsx-feuilles.py", import.meta.url).pathname, sortie, json], { stdio: "inherit" });
console.log(sortie);
console.log("talents", compter(lignesTalents), "projets", compter(lignesProjets));
for (const l of lignesTalents.filter((l) => l[0].startsWith("1"))) console.log("T1", l[1], "|", l[3], l[4], "visa", l[6], "| bandeau:", l[11]);
for (const l of lignesProjets.filter((l) => l[0].startsWith("1"))) console.log("P1", l[1], "|", l[5], "|", l[6], l[7], "visa", l[9], "| bandeau:", l[4]);
