// Traduit en français les textes anglais écrits dans une case française (07/10/2026).
//
// Les traductions sont faites à part (sous-agents), puis appliquées ici :
//   node scripts/traduire-textes-anglais.mjs <dossier>            → essai : compte, n'écrit rien
//   node scripts/traduire-textes-anglais.mjs <dossier> appliquer  → écrit, en gardant l'ancien texte
//                                                                   dans corrections_texte_sauvegarde
//
// <dossier> contient cand.json (les textes d'origine) et out1.json… outN.json (les traductions).
// Un texte modifié depuis l'extraction n'est jamais écrasé (comparaison avec l'ancien).
// Pour annuler : remettre `ancien` dans la colonne, depuis la table de sauvegarde.
import { readFileSync, readdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const dossier = process.argv[2];
const appliquer = process.argv[3] === "appliquer";
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const a = createClient(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const origine = JSON.parse(readFileSync(`${dossier}/cand.json`, "utf8"));
const parCle = new Map(origine.map((o) => [`${o.tab}|${o.id}|${o.col}`, o]));
const sorties = readdirSync(dossier).filter((f) => /^out\d+\.json$/.test(f));
const traductions = sorties.flatMap((f) => JSON.parse(readFileSync(`${dossier}/${f}`, "utf8")));

let ecrits = 0, inchanges = 0, modifies = 0, inconnus = 0, vides = 0, legacy = 0;
for (const t of traductions) {
  const o = parCle.get(`${t.tab}|${t.id}|${t.col}`);
  if (!o) { inconnus++; continue; }
  if (t.inchange) { inchanges++; continue; }
  if (!t.fr || !t.fr.trim() || t.fr.trim() === o.texte.trim()) { vides++; continue; }

  const { data: actuel } = await a.from(t.tab).select(t.col).eq("id", t.id).maybeSingle();
  if (!actuel || actuel[t.col] !== o.texte) { modifies++; continue; }
  if (!appliquer) { ecrits++; continue; }

  const { error: e1 } = await a.from("corrections_texte_sauvegarde").insert({
    table_name: t.tab, ligne_id: t.id, colonne: t.col, ancien: o.texte, nouveau: t.fr,
  });
  if (e1) throw new Error(`sauvegarde ${t.tab} ${t.id}: ${e1.message}`);
  const { error: e2 } = await a.from(t.tab).update({ [t.col]: t.fr }).eq("id", t.id);
  if (e2) throw new Error(`écriture ${t.tab} ${t.id}: ${e2.message}`);
  ecrits++;

  // Une biographie encore à réclamer est aussi gardée dans legacy_profiles (recopiée à l'inscription).
  if (t.tab === "profiles" && t.col === "biofilmo") {
    const { data: p } = await a.from("profiles").select("legacy_id").eq("id", t.id).maybeSingle();
    if (p?.legacy_id) {
      const { data: l } = await a.from("legacy_profiles").update({ biofilmo: t.fr })
        .eq("legacy_user_id", Number(p.legacy_id)).eq("biofilmo", o.texte).select("legacy_user_id");
      legacy += l?.length ?? 0;
    }
  }
}
console.log(`${appliquer ? "écrits" : "à écrire"} : ${ecrits} ; déjà français (inchangés) : ${inchanges} ; modifiés depuis (ignorés) : ${modifies} ; vides : ${vides} ; inconnus : ${inconnus} ; legacy_profiles : ${legacy} ; sur ${origine.length} textes`);
