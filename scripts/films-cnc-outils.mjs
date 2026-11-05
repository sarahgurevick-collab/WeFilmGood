// Outils communs aux scripts des films du CNC (importer-films-cnc.mjs,
// rattacher-entrees-films-cnc.mjs) : lecture d'un classeur .xlsx sans
// bibliothèque (zip + XML), normalisation des titres, connexion à la base.
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { createClient } from "@supabase/supabase-js";

export function connexion() {
  const env = Object.fromEntries(
    readFileSync(new URL("../.env.local", import.meta.url), "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}

// L'API renvoie au plus 1 000 lignes par lecture : on lit tout, page par page.
export async function toutLire(construire) {
  const tout = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await construire().range(debut, debut + 999);
    if (error) throw error;
    tout.push(...data);
    if (data.length < 1000) return tout;
  }
}

function dezipper(chemin) {
  const b = readFileSync(chemin);
  let e = b.length - 22;
  while (b.readUInt32LE(e) !== 0x06054b50) e--;
  const n = b.readUInt16LE(e + 10);
  let p = b.readUInt32LE(e + 16);
  const fichiers = {};
  for (let i = 0; i < n; i++) {
    const methode = b.readUInt16LE(p + 10), taille = b.readUInt32LE(p + 20);
    const nl = b.readUInt16LE(p + 28), xl = b.readUInt16LE(p + 30), cl = b.readUInt16LE(p + 32);
    const loc = b.readUInt32LE(p + 42);
    const nom = b.toString("utf8", p + 46, p + 46 + nl);
    const debut = loc + 30 + b.readUInt16LE(loc + 26) + b.readUInt16LE(loc + 28);
    const donnees = b.subarray(debut, debut + taille);
    fichiers[nom] = () => (methode === 0 ? donnees : inflateRawSync(donnees)).toString("utf8");
    p += 46 + nl + xl + cl;
  }
  return fichiers;
}

const decoder = (s) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(+c))
    .replace(/&#x([0-9a-f]+);/gi, (_, c) => String.fromCodePoint(parseInt(c, 16)))
    .replace(/&amp;/g, "&");
const textes = (xml) => [...xml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("");
const colonne = (ref) => {
  let n = 0;
  for (const c of ref.replace(/\d+/g, "")) n = n * 26 + c.charCodeAt(0) - 64;
  return n - 1;
};

// Renvoie { nomDeFeuille: [ [cellule, ...], ... ] } (null = cellule vide).
// Les cellules sont lues par leur référence (A5, B5…) : une cellule vide
// ne décale donc jamais les suivantes.
export function lireClasseur(chemin, garderFeuille = () => true) {
  const f = dezipper(chemin);
  const partages = [...(f["xl/sharedStrings.xml"]?.() ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => decoder(textes(m[1])));
  const liens = Object.fromEntries(
    [...f["xl/_rels/workbook.xml.rels"]().matchAll(/<Relationship [^>]*>/g)].map((m) => [
      m[0].match(/Id="([^"]*)"/)[1],
      m[0].match(/Target="([^"]*)"/)[1],
    ]),
  );
  const feuilles = {};
  for (const m of f["xl/workbook.xml"]().matchAll(/<sheet [^>]*>/g)) {
    const nom = m[0].match(/name="([^"]*)"/)[1];
    if (!garderFeuille(nom)) continue;
    const xml = f[liens[m[0].match(/r:id="([^"]*)"/)[1]].replace(/^\/?(xl\/)?/, "xl/")]();
    const lignes = [];
    for (const r of xml.matchAll(/<row [^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const cellules = [];
      for (const c of (r[1] || "").matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const type = (c[1].match(/t="([^"]*)"/) || [])[1];
        const v = c[2] && c[2].match(/<v>([\s\S]*?)<\/v>/);
        const direct = c[2] && c[2].match(/<is>([\s\S]*?)<\/is>/);
        let valeur = null;
        if (type === "s" && v) valeur = partages[+v[1]];
        else if (direct) valeur = decoder(textes(direct[1]));
        else if (v) valeur = type === "str" ? decoder(v[1]) : v[1];
        cellules[colonne(c[1].match(/r="([A-Z]+\d+)"/)[1])] = valeur;
      }
      lignes.push(Array.from(cellules, (x) => x ?? null));
    }
    feuilles[nom] = lignes;
  }
  return feuilles;
}

// Titre pour le rapprochement : sans accents, ponctuation ni article du
// début. Le CNC écrit l'article à la fin entre parenthèses
// (« Comte de Monte-Cristo (Le) », « Adieu à la nuit (L') », « (une) enfance ») :
// on le retire de toute façon, c'est ce qui rend les deux écritures égales.
const ARTICLES = new Set(["le", "la", "les", "l", "un", "une", "des", "the", "il", "el", "las", "los", "das", "der", "die", "ein", "eine"]);
export function simplifier(texte) {
  return String(texte || "")
    .replace(/œ/gi, "oe").replace(/æ/gi, "ae").replace(/&/g, " et ")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
export function normaliserTitre(titre) {
  const t = simplifier(
    String(titre || "").replace(/\s*\((l['’]|le|la|les|un|une|des|the|il|el|las|los|das|der|die|ein|eine)\)\s*/gi, " "),
  );
  const mots = t.split(" ");
  if (mots.length > 1 && ARTICLES.has(mots[0])) mots.shift();
  return mots.join(" ");
}

// « DELAPORTE Matthieu / DE LA PATELLIERE Alexandre » -> noms de famille en
// minuscules sans accents : ["delaporte", "de la patelliere"] (le CNC met le
// nom en capitales devant le prénom).
export function nomsDeFamille(realisateur) {
  return String(realisateur || "")
    .split(/\s*\/\s*/)
    .map((r) => {
      const mots = r.trim().split(/\s+/);
      const nom = [];
      for (const m of mots) {
        if (m === m.toUpperCase() && /[A-ZÀ-Ý]/.test(m)) nom.push(m);
        else break;
      }
      return simplifier((nom.length ? nom : mots.slice(0, 1)).join(" "));
    })
    .filter(Boolean);
}
