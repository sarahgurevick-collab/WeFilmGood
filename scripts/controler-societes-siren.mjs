// Sarah, 14/11/2026 : contrôler une fois les sociétés dont on a le SIREN
// (repris de WFG 1, table societes_siren, réservée à l'administration) et
// lui remettre la liste des sociétés fermées — « La société aurait pu être
// fermée, auquel cas ça change le rapport avec les auteurs. »
// Source : l'annuaire public des entreprises de l'État
// (recherche-entreprises.api.gouv.fr, gratuit, sans clé). On n'y envoie que
// le numéro de SIREN, rien sur le membre.
// Usage : node scripts/controler-societes-siren.mjs            (les numéros pas encore contrôlés)
//         node scripts/controler-societes-siren.mjs --tout     (tout recontrôler)
//         node scripts/controler-societes-siren.mjs --classeur (seulement refaire le classeur)
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { connexion, toutLire } from "./films-cnc-outils.mjs";

const base = connexion();
const tout = process.argv.includes("--tout");
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function chercher(siren) {
  for (let essai = 0; essai < 6; essai++) {
    const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siren}&page=1&per_page=5`, { headers: { accept: "application/json" } }).catch(() => null);
    if (r?.ok) {
      const { results } = await r.json();
      return (results ?? []).find((e) => e.siren === siren) ?? null;
    }
    await attendre(1500 * (essai + 1));
  }
  throw new Error(`annuaire injoignable pour ${siren}`);
}

if (!process.argv.includes("--classeur")) {
  const lignes = await toutLire(() => {
    const q = base.from("societes_siren").select("profile_id, siren").order("profile_id");
    return tout ? q : q.is("controle_le", null);
  });
  console.log(lignes.length, "numéros à contrôler");
  let n = 0;
  for (const l of lignes) {
    const e = await chercher(l.siren);
    const { error } = await base.from("societes_siren").update({
      etat: !e ? "introuvable" : e.etat_administratif === "A" ? "active" : "fermee",
      denomination: e?.nom_complet ?? null,
      fermee_le: e?.date_fermeture ?? null,
      controle_le: new Date().toISOString(),
    }).eq("profile_id", l.profile_id);
    if (error) throw error;
    if (++n % 100 === 0) console.log(n);
    await attendre(180);
  }
}

// Le classeur pour Sarah.
const sirens = await toutLire(() => base.from("societes_siren").select("profile_id, siren, saisi, etat, denomination, fermee_le, controle_le").order("profile_id"));
const profils = new Map((await toutLire(() => base.from("profiles").select("id, first_name, last_name, societe, category, validation_status").not("societe", "is", null).order("id"))).map((p) => [p.id, p]));
const manquants = sirens.filter((s) => !profils.has(s.profile_id)).map((s) => s.profile_id);
for (let i = 0; i < manquants.length; i += 200) {
  const { data } = await base.from("profiles").select("id, first_name, last_name, societe, category, validation_status").in("id", manquants.slice(i, i + 200));
  for (const p of data ?? []) profils.set(p.id, p);
}
const LIBELLE = { active: "En activité", fermee: "Fermée", introuvable: "Numéro introuvable" };
const ligne = (s) => {
  const p = profils.get(s.profile_id) ?? {};
  return [LIBELLE[s.etat] ?? "Pas contrôlé", `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim(), p.societe ?? "", s.denomination ?? "", s.siren, s.fermee_le ?? "",
    p.category ?? "", p.validation_status ?? "", `https://app.wefilmgood.com/membres/${s.profile_id}`];
};
const colonnes = ["État", "Membre", "Société (saisie sur WFG 1)", "Nom officiel de la société", "SIREN", "Fermée le", "Catégorie", "Validation", "Profil"];
const largeurs = [20, 28, 34, 40, 12, 12, 13, 13, 50];
const ordre = { fermee: 0, introuvable: 1, active: 2 };
const toutes = sirens.map((s) => [ordre[s.etat] ?? 3, ligne(s)]).sort((a, b) => a[0] - b[0] || String(b[1][5]).localeCompare(String(a[1][5])) || a[1][1].localeCompare(b[1][1])).map((x) => x[1]);
const compte = (e) => sirens.filter((s) => s.etat === e).length;
const date = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }).replace("/", "-");
const sortie = `/home/wfg/exports/Sociétés des producteurs — contrôle par le SIREN (${date}).xlsx`;
const json = "/home/wfg/imports/cnc/controle-societes-siren.json";
writeFileSync(json, JSON.stringify({ feuilles: [
  { nom: "Résumé", colonnes: ["Sociétés dont on a le SIREN (repris de WFG 1)", sirens.length], largeurs: [56, 12], lignes: [
    ["En activité", compte("active")], ["Fermées", compte("fermee")], ["Numéro introuvable dans l'annuaire", compte("introuvable")],
    ["", ""], ["Source : annuaire public des entreprises (État). Le SIREN a été saisi par le producteur sur WFG 1 :", ""],
    ["il dit si CETTE société existe encore, pas si le producteur y travaille toujours.", ""],
  ] },
  { nom: "Fermées", colonnes, largeurs, lignes: toutes.filter((l) => l[0] === "Fermée") },
  { nom: "Introuvables", colonnes, largeurs, lignes: toutes.filter((l) => l[0] === "Numéro introuvable") },
  { nom: "Toutes", colonnes, largeurs, lignes: toutes },
] }));
execFileSync("python3", ["-I", new URL("./ecrire-xlsx-feuilles.py", import.meta.url).pathname, sortie, json], { stdio: "inherit" });
console.log(sortie, "| actives", compte("active"), "| fermées", compte("fermee"), "| introuvables", compte("introuvable"));
