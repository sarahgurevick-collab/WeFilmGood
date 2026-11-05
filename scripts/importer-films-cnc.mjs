// Import des films agréés par le CNC (2001-2025) dans la table films_cnc.
// Source : « Liste des films agréés » (open data du CNC, data.gouv.fr),
// téléchargée dans ~/imports/cnc/films_agrees_2001_2025.xlsx :
//   curl -L -A "Mozilla/5.0 Chrome/120" -o ~/imports/cnc/films_agrees_2001_2025.xlsx \
//     "http://www.cnc.fr/c/document_library/get_file?uuid=3adc5d0e-e89a-4404-8367-428973fb1560&groupId=18"
// (le CNC refuse les requêtes sans nom de navigateur).
//
// Usage : node scripts/importer-films-cnc.mjs [--essai]   (--essai : compte sans écrire)
//
// Rejouable : un film est identifié par (année d'agrément, visa) ; le
// rejouer remet à jour les colonnes venues du CNC et ne touche jamais aux
// entrées (entrees_france, annee_sortie, source_entrees, lumiere_id).
import { lireClasseur, normaliserTitre, connexion } from "./films-cnc-outils.mjs";

const FICHIER = "/home/wfg/imports/cnc/films_agrees_2001_2025.xlsx";
const essai = process.argv.includes("--essai");

const texte = (v) => {
  const t = (v ?? "").toString().trim();
  return t === "" || t === "-" ? null : t;
};
// Une croix, « OUI » ou un code = oui ; vide, « 0 », « - », « non » = non.
const coche = (v) => {
  const t = texte(v);
  return t !== null && !/^(0|non|n)$/i.test(t);
};
const GENRES = { fiction: "fiction", docu: "documentaire", documentaire: "documentaire", animation: "animation", anim: "animation" };

// Pays : le CNC les écrit de dix façons (Fr, FRANCE, Belg, BELGIQUE, GB…).
const PAYS = {
  fr: "France", france: "France", be: "Belgique", bel: "Belgique", belg: "Belgique", belgique: "Belgique",
  all: "Allemagne", allemagne: "Allemagne", it: "Italie", italie: "Italie", esp: "Espagne", es: "Espagne", espagne: "Espagne",
  gb: "Royaume-Uni", ru: "Royaume-Uni", "r u": "Royaume-Uni", "grande bretagne": "Royaume-Uni", "royaume uni": "Royaume-Uni",
  lux: "Luxembourg", luxembourg: "Luxembourg", can: "Canada", canada: "Canada", port: "Portugal", portugal: "Portugal",
  "pays bas": "Pays-Bas", suisse: "Suisse", suede: "Suède", grece: "Grèce", israel: "Israël",
};
const joli = (s) => s.toLowerCase().replace(/(^|[\s'’-])([a-zà-ÿ])/g, (_, a, b) => a + b.toUpperCase());
function lirePays(brut) {
  const t = texte(brut);
  if (!t) return null;
  const liste = [];
  for (const m of t.matchAll(/(?:^|\/)\s*([^/]*?[A-Za-zÀ-ÿ][^/]*?)\s*-\s*(\d+)\s*(?=\/|$)/g)) {
    const nom = m[1].replace(/^\/+\s*/, "");
    const cle = nom.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[.-]/g, " ").replace(/\s+/g, " ").trim();
    liste.push({ pays: PAYS[cle] ?? joli(nom.trim()), part: +m[2] });
  }
  return liste.length ? liste : null;
}

const classeur = lireClasseur(FICHIER, (nom) => /^\d{4}$/.test(nom));
const films = [];
for (const [annee, lignes] of Object.entries(classeur)) {
  const entete = lignes.findIndex((l) => (l[0] || "").trim() === "VISA");
  if (entete < 0) throw new Error(`Feuille ${annee} : ligne de titres introuvable`);
  const cles = lignes[entete].map((c) => (c || "").trim());
  const col = (...noms) => cles.findIndex((c) => noms.includes(c));
  const [iVisa, iTitre, iReal, iProd, iDevis, iGenre, iEof, iRang, iBonus, iAsr, iPayant, iClair, iSofica, iCredit, iRegion, iNat] = [
    col("VISA"), col("TITRE"), col("REALISATEUR"), col("PRODUCTEURS DELEGUES"), col("DEVIS"), col("GENRE"), col("EOF"), col("RANG"),
    col("BONUS PARITE"), col("ASR"), col("PAYANT", "PAYANTE"), col("CLAIR"), col("SOFICA"), col("CREDIT D'IMPOT"), col("AIDE REGIONALE"), col("NATIONALITE"),
  ];
  for (const l of lignes.slice(entete + 1)) {
    if (!texte(l[iTitre])) continue;
    const brut = {};
    cles.forEach((c, i) => { if (c && l[i] !== null && l[i] !== undefined) brut[c] = l[i]; });
    const at = (i) => (i >= 0 ? l[i] : null);
    const devis = Math.round(Number(String(at(iDevis) ?? "").replace(/\s/g, "")));
    const rang = texte(at(iRang));
    const parts = rang ? rang.split(/\s*\/\s*/).map((r) => r.trim()) : [];
    const eof = texte(at(iEof))?.toUpperCase();
    const asr = texte(at(iAsr))?.toLowerCase();
    const nat = lirePays(at(iNat));
    films.push({
      visa: Number(String(l[iVisa]).trim()),
      annee_agrement: Number(annee),
      titre: l[iTitre].trim(),
      titre_normalise: normaliserTitre(l[iTitre]),
      realisateur: texte(at(iReal)),
      producteurs_delegues: texte(at(iProd)),
      devis: devis > 0 ? devis : null,
      genre: GENRES[(texte(at(iGenre)) || "").toLowerCase()] ?? null,
      initiative_francaise: eof === "OUI" ? true : eof === "NON" ? false : null,
      rang_realisateur: rang,
      premier_film: parts.length ? parts.every((p) => p === "1") : null,
      bonus_parite: coche(at(iBonus)),
      avance_sur_recettes: asr === "avant" ? "avant" : asr === "après" || asr === "apres" ? "apres" : null,
      chaines_payantes: texte(at(iPayant)),
      chaines_clair: texte(at(iClair)),
      sofica: coche(at(iSofica)),
      credit_impot: coche(at(iCredit)),
      aide_regionale: coche(at(iRegion)),
      nationalites: nat,
      part_francaise: nat ? nat.filter((n) => n.pays === "France").reduce((s, n) => s + n.part, 0) : null,
      brut,
    });
  }
}

const parAnnee = {};
for (const f of films) parAnnee[f.annee_agrement] = (parAnnee[f.annee_agrement] || 0) + 1;
console.log(`${films.length} films lus, ${films.filter((f) => f.devis).length} avec devis`);
console.log(Object.entries(parAnnee).map(([a, n]) => `${a}:${n}`).join(" "));
if (essai) process.exit(0);

const supabase = connexion();
for (let i = 0; i < films.length; i += 500) {
  const { error } = await supabase.from("films_cnc").upsert(films.slice(i, i + 500), { onConflict: "annee_agrement,visa" });
  if (error) throw error;
  console.log(`  ${Math.min(i + 500, films.length)} / ${films.length}`);
}
console.log("Import terminé.");
