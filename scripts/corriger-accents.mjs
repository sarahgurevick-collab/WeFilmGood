// Rend leurs accents aux textes de l'ancienne plateforme (06/10/2026).
//
// Des textes de WFG 1 sont arrivés avec « ? » à la place des accents :
//   « Infirmie?re » (père : pe?re), « a? » (à), « l?université » (l'université),
//   « arriv?e » (arrivée : le « ? » remplace toute la lettre).
// L'original de WFG 1 est déjà abîmé : il faut reconstituer.
//
// Méthode : pour chaque mot abîmé, on génère les écritures accentuées possibles
// et on garde la plus fréquente dans le vocabulaire des textes déjà bien écrits
// du site. Un « ? » en fin de phrase n'est jamais touché (c'est peut-être une
// vraie question), sauf si un autre « ? » du même mot est une lettre perdue.
// Ce qu'on ne sait pas deviner (Ya?mur, XVI?) reste tel quel et est listé.
//
//   node scripts/corriger-accents.mjs essai      → compte, liste les mots restants, n'écrit rien
//   node scripts/corriger-accents.mjs appliquer  → corrige, en gardant l'ancien texte dans
//                                                  corrections_texte_sauvegarde (migration 0137)
//
// Un texte modifié depuis l'essai n'est jamais écrasé (comparaison avec l'ancien).
// Pour annuler : remettre `ancien` dans la colonne, depuis la table de sauvegarde.
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const a = createClient(env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Les noms propres (Jovanovi?, Papli?ski…) ne sont pas touchés : les lettres perdues
// ne sont pas françaises. Les colonnes « nom » restent donc en dehors.
const CIBLES = [
  { table: "characters", cle: "id", colonnes: ["biography"] },
  { table: "profiles", cle: "id", colonnes: ["bio", "biofilmo"] },
  { table: "projects", cle: "id", colonnes: ["title", "logline", "synopsis"] },
  { table: "legacy_reading_reports", cle: "legacy_review_id", colonnes: ["content", "wfg_review", "wfg_review_en"] },
  { table: "legacy_profiles", cle: "legacy_user_id", colonnes: ["biofilmo", "testimonial"] },
];

async function tout(table, colonnes) {
  const lignes = [];
  for (let de = 0; ; de += 500) {
    const { data, error } = await a.from(table).select(colonnes).order(colonnes.split(",")[0].trim()).range(de, de + 499);
    if (error) throw new Error(`${table}: ${error.message}`);
    lignes.push(...data);
    if (data.length < 500) break;
  }
  return lignes;
}

// 1) Le vocabulaire : les mots déjà bien écrits de tout le site.
const donnees = {};
const vocab = new Map(); // mots accentués
const vocabTous = new Map(); // tous les mots
for (const c of CIBLES) {
  donnees[c.table] = await tout(c.table, [c.cle, ...c.colonnes].join(", "));
  for (const l of donnees[c.table]) {
    for (const col of c.colonnes) {
      const t = l[col];
      if (!t) continue;
      for (const m of t.matchAll(/[\p{L}]+/gu)) {
        const mot = m[0].toLowerCase();
        vocabTous.set(mot, (vocabTous.get(mot) ?? 0) + 1);
        if (/[àâäéèêëîïôöùûüç]/.test(mot)) vocab.set(mot, (vocab.get(mot) ?? 0) + 1);
      }
    }
  }
}
console.log("vocabulaire accentué :", vocab.size, "mots");

// 2) Les écritures possibles d'un mot abîmé.
const VARIANTES = { e: "éèêë", a: "àâä", i: "îï", o: "ôö", u: "ùûü", c: "ç", E: "ÉÈÊË", A: "ÀÂ", I: "ÎÏ", O: "Ô", U: "ÙÛ", C: "Ç" };
const SUBS = "éèêëàâîïôûùç".split("");
function candidats(mot) {
  const chars = [...mot];
  // Plus de quatre « ? » dans un mot : ce n'est pas un accent perdu, et les combinaisons exploseraient.
  if (chars.filter((c) => c === "?").length > 4) return [];
  let liste = [""];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (chars[i + 1] !== "?") {
      liste = liste.map((p) => p + ch);
      continue;
    }
    const dernier = i + 1 === chars.length - 1;
    const options = [];
    // Un accent perdu sur la lettre (pe?re → père) ...
    if (VARIANTES[ch]) options.push(...VARIANTES[ch].split(""));
    // ... ou la lettre accentuée remplacée tout entière (arriv?e → arrivée).
    if (!dernier) options.push(...SUBS.map((o) => ch + o));
    if (options.length === 0) return [];
    liste = liste.flatMap((p) => options.map((o) => p + o));
    i++;
  }
  return liste;
}
const meilleurDe = (mot) =>
  candidats(mot)
    .map((c) => [c, vocab.get(c.toLowerCase()) ?? 0])
    .filter(([, n]) => n > 0)
    .sort((x, y) => y[1] - x[1])[0];

const FIN = /^(\s*$|\s+[\p{Lu}«"“(\n]|[»”")]|\n)/u;

// 3) Un texte corrigé, ce qui a été fait, et ce qui reste incertain.
function corriger(texte) {
  const incertains = [];
  const appliques = [];
  // a) Les apostrophes devenues « ? » : l?université, d?un, qu?il, C?est.
  let t = texte.replace(
    /(^|[^\p{L}])((?:qu|jusqu|lorsqu|puisqu|quoiqu|presqu|quelqu|Qu|Jusqu|Lorsqu|Puisqu)|[djlmnstDJLMNST])\?(?=[aeiouyhàâéèêëîïôöùûœAEIOUYH])/gu,
    (m, avant, racine) => `${avant}${racine}’`,
  );
  t = t.replace(/(^|[^\p{L}])([cC])\?(?=[eéèêiîy])/gu, (m, avant, c) => `${avant}${c}’`);
  // b) Les accents perdus.
  t = t.replace(/[\p{L}]+(?:\?[\p{L}]*)+/gu, (mot, decalage) => {
    const apres = t.slice(decalage + mot.length);
    // Un « ? » final en fin de phrase : peut-être une vraie question, on n'y touche pas.
    if (mot.endsWith("?") && FIN.test(apres)) {
      const nu = mot.slice(0, -1);
      if (!nu.includes("?")) return mot;
      const interieur = meilleurDe(nu);
      if (interieur) {
        appliques.push(`${mot} → ${interieur[0]}?`);
        return interieur[0] + "?";
      }
      incertains.push(mot);
      return mot;
    }
    const meilleur = meilleurDe(mot);
    if (meilleur) {
      appliques.push(`${mot} → ${meilleur[0]}`);
      return meilleur[0];
    }
    // « a? » tout seul : à. Un nom propre en majuscule : É.
    if (/^[aA]\?$/.test(mot)) {
      const r = mot[0] === "a" ? "à" : "À";
      appliques.push(`${mot} → ${r}`);
      return r;
    }
    if (/^E\?/.test(mot) && !mot.slice(2).includes("?") && mot.length >= 5) {
      const r = "É" + mot.slice(2);
      appliques.push(`${mot} → ${r} (nom propre, à vérifier)`);
      return r;
    }
    incertains.push(mot);
    return mot;
  });
  return { nouveau: t, incertains, appliques };
}

// 4) Essai, ou application.
const appliquer = process.argv[2] === "appliquer";
const total = { textes: 0, modifies: 0, ecrits: 0 };
const incertainsTous = new Map();
const transformations = new Map();
for (const c of CIBLES) {
  let n = 0;
  let nModifies = 0;
  let nEcrits = 0;
  for (const l of donnees[c.table]) {
    for (const col of c.colonnes) {
      const ancien = l[col];
      if (!ancien || !/[\p{L}]\?/u.test(ancien)) continue;
      n++;
      const { nouveau, incertains, appliques } = corriger(ancien);
      for (const i of incertains) incertainsTous.set(i, (incertainsTous.get(i) ?? 0) + 1);
      for (const x of appliques) transformations.set(x, (transformations.get(x) ?? 0) + 1);
      if (nouveau === ancien) continue;
      nModifies++;
      if (!appliquer) continue;
      // Seulement si le texte n'a pas changé depuis : on n'écrase jamais une correction faite à la main.
      // (On relit le texte actuel plutôt que de le mettre dans l'adresse de la requête : trop long.)
      const { data: actuel, error: e0 } = await a.from(c.table).select(col).eq(c.cle, l[c.cle]).maybeSingle();
      if (e0 || !actuel || actuel[col] !== ancien) {
        console.log("texte modifié depuis l'essai, laissé tel quel :", c.table, l[c.cle]);
        continue;
      }
      const { data: sauve, error: e1 } = await a
        .from("corrections_texte_sauvegarde")
        .insert({ table_name: c.table, ligne_id: String(l[c.cle]), colonne: col, ancien, nouveau })
        .select("id")
        .single();
      if (e1) {
        console.log("sauvegarde refusée", c.table, l[c.cle], e1.message);
        continue;
      }
      const { error: e2 } = await a.from(c.table).update({ [col]: nouveau }).eq(c.cle, l[c.cle]);
      if (e2) {
        console.log("mise à jour refusée", c.table, l[c.cle], e2.message);
        await a.from("corrections_texte_sauvegarde").delete().eq("id", sauve.id);
      } else nEcrits++;
    }
  }
  console.log(`${c.table} (${c.colonnes.join(", ")}) : ${n} textes avec « ? » après une lettre, ${nModifies} à corriger${appliquer ? `, ${nEcrits} écrits` : ""}`);
  total.textes += n;
  total.modifies += nModifies;
  total.ecrits += nEcrits;
}
console.log(`TOTAL : ${total.textes} textes, ${total.modifies} corrigés${appliquer ? `, ${total.ecrits} écrits` : " (essai : rien n'est écrit)"}`);
console.log("transformations différentes :", transformations.size);
console.log("mots incertains (laissés tels quels) :", [...incertainsTous.entries()].map(([m, k]) => m + (k > 1 ? `×${k}` : "")).slice(0, 120).join(" "));
if (process.env.SORTIE) {
  writeFileSync(process.env.SORTIE, [...transformations.entries()].map(([x, k]) => `${x} ×${k}`).join("\n"));
}
