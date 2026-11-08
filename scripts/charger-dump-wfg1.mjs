// Charge un dump MySQL de WFG 1 (export phpMyAdmin, « ouifeelm_good.sql »)
// dans un schéma de la base Postgres de WFG 2, sans MariaDB ni pgloader :
// le fichier est lu ligne à ligne et recopié dans Postgres par COPY.
//
// Pourquoi : la base MariaDB temporaire a été supprimée du serveur le
// 21/09/2026 et aucun outil de conversion n'est installé. Le dump
// phpMyAdmin a une forme simple (une ligne par enregistrement), on la
// lit directement.
//
// Ce que fait le script :
//   - crée le schéma demandé (refuse s'il existe déjà, sauf --remplacer) ;
//   - recrée chaque table du dump avec les mêmes colonnes : les nombres
//     entiers en bigint, tout le reste en texte (dates comprises), comme
//     la copie de septembre (schéma wfg1) ;
//   - recopie les lignes (accents : UTF-8, avec repli Windows-1252 pour
//     les textes abîmés, comme en septembre) ;
//   - recrée les index de la copie de septembre, retire les droits de
//     l'API (anon, authenticated) ;
//   - compare les nombres de lignes avec la copie de septembre.
//
// Lancement (une vingtaine de minutes pour 3 Go) :
//   node scripts/charger-dump-wfg1.mjs --dump ~/imports/wfg1-final.sql --schema wfg1_final
//   node scripts/charger-dump-wfg1.mjs --dump … --schema … --tables accounts,projects   (quelques tables seulement)
//   node scripts/charger-dump-wfg1.mjs --dump … --schema … --remplacer                  (écrase un schéma d'essai)
//
// Le dump contient des données personnelles : il reste dans ~/imports,
// jamais dans le dépôt.
import { createReadStream, existsSync, statSync } from "node:fs";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
function option(nom, defaut) {
  const i = args.indexOf(nom);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : defaut;
}
const DUMP = option("--dump", null);
const SCHEMA = option("--schema", "wfg1_final");
const TABLES = option("--tables", null)?.split(",").map((t) => t.trim()).filter(Boolean) ?? null;
const REMPLACER = args.includes("--remplacer");
const REFERENCE = option("--reference", "wfg1"); // la copie de septembre, pour comparer

if (!DUMP || !existsSync(DUMP)) {
  console.error("Il faut --dump <fichier .sql> (le dump MySQL de WFG 1, dans ~/imports).");
  process.exit(1);
}
if (!/^[a-z_][a-z0-9_]*$/.test(SCHEMA) || SCHEMA === "public" || SCHEMA === "auth" || SCHEMA === "storage") {
  console.error(`Nom de schéma refusé : ${SCHEMA}`);
  process.exit(1);
}

// ---------------------------------------------------------------------
// Postgres : via le conteneur supabase-db, comme les migrations.
// ---------------------------------------------------------------------
const PSQL = ["exec", "-i", "supabase-db", "psql", "-U", "postgres", "-X", "-q", "-v", "ON_ERROR_STOP=1"];

function sql(texte, { lignes = false } = {}) {
  return new Promise((resoudre, rejeter) => {
    const p = spawn("docker", [...PSQL, "-At", "-F", "\t"], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("close", (code) => {
      if (code !== 0) return rejeter(new Error(err.trim() || `psql a échoué (${code})`));
      resoudre(lignes ? out.split("\n").filter(Boolean).map((l) => l.split("\t")) : out.trim());
    });
    p.stdin.end(texte);
  });
}
const q = (ident) => `"${ident.replace(/"/g, '""')}"`;

// ---------------------------------------------------------------------
// Lecture du dump
// ---------------------------------------------------------------------
const utf8 = new TextDecoder("utf-8", { fatal: true });
const cp1252 = new TextDecoder("windows-1252");
// Un texte est de l'UTF-8 valide (le cas courant) ; sinon on le relit
// octet par octet : les suites UTF-8 valides sont gardées, chaque octet
// isolé (un « é » latin1 égaré) est lu en Windows-1252. Ainsi un texte qui
// mêle les deux ne perd rien.
function decoder(octets) {
  try {
    return utf8.decode(octets);
  } catch {
    let sortie = "";
    for (let i = 0; i < octets.length; ) {
      const b = octets[i];
      const longueur = b < 0x80 ? 1 : b >= 0xc2 && b <= 0xdf ? 2 : b >= 0xe0 && b <= 0xef ? 3 : b >= 0xf0 && b <= 0xf4 ? 4 : 0;
      let valide = longueur > 0 && i + longueur <= octets.length;
      for (let k = 1; valide && k < longueur; k++) valide = (octets[i + k] & 0xc0) === 0x80;
      if (valide) {
        try {
          sortie += utf8.decode(octets.subarray(i, i + longueur));
          i += longueur;
          continue;
        } catch {}
      }
      sortie += cp1252.decode(octets.subarray(i, i + 1));
      i++;
    }
    return sortie;
  }
}

// Une ligne « (v1, v2, …), » ou « (v1, v2, …); » → tableau de valeurs
// (null pour NULL). La ligne est donnée en latin1 (un caractère = un
// octet) ; chaque texte est décodé à part, pour qu'une ligne mêlant du bon
// UTF-8 et un texte abîmé ne soit pas entièrement abîmée.
function lireLigne(l) {
  const valeurs = [];
  let i = 0;
  const n = l.length;
  while (i < n && l[i] !== "(") i++;
  i++;
  while (i < n) {
    while (i < n && (l[i] === " " || l[i] === ",")) i++;
    if (i >= n || l[i] === ")") break;
    if (l[i] === "'") {
      i++;
      let morceau = "";
      for (;;) {
        const c = l[i];
        if (c === undefined) throw new Error("texte non fermé");
        if (c === "\\") {
          const d = l[i + 1];
          i += 2;
          switch (d) {
            case "0": break; // octet nul : Postgres n'en veut pas
            case "n": morceau += "\n"; break;
            case "r": morceau += "\r"; break;
            case "t": morceau += "\t"; break;
            case "b": morceau += "\b"; break;
            case "Z": morceau += "\x1a"; break;
            case "%": morceau += "\\%"; break;
            case "_": morceau += "\\_"; break;
            default: morceau += d; // \' \" \\ et les autres
          }
        } else if (c === "'") {
          if (l[i + 1] === "'") { morceau += "'"; i += 2; }
          else { i++; break; }
        } else {
          morceau += c;
          i++;
        }
      }
      valeurs.push(decoder(Buffer.from(morceau, "latin1")));
    } else {
      let j = i;
      while (j < n && l[j] !== "," && l[j] !== ")") j++;
      const brut = l.slice(i, j).trim();
      valeurs.push(brut === "NULL" ? null : brut);
      i = j;
    }
  }
  return valeurs;
}

// Valeur → format texte de COPY.
function pourCopy(v) {
  if (v === null) return "\\N";
  return v.replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\0/g, "");
}

const ENTIERS = /^(tiny|small|medium|big)?int\b/i;

// Types des colonnes de la copie de septembre, pour faire pareil.
const typesReference = new Map();
try {
  for (const [table, colonne, type] of await sql(
    `select table_name, column_name, data_type from information_schema.columns where table_schema = '${REFERENCE}'`,
    { lignes: true },
  )) typesReference.set(`${table}.${colonne}`, type);
} catch {}

// ---------------------------------------------------------------------
// Schéma
// ---------------------------------------------------------------------
const existe = await sql(`select 1 from information_schema.schemata where schema_name = '${SCHEMA}'`);
if (existe && !REMPLACER) {
  console.error(`Le schéma ${SCHEMA} existe déjà. Choisir un autre nom, ou --remplacer pour l'écraser.`);
  process.exit(1);
}
if (existe) await sql(`drop schema ${q(SCHEMA)} cascade`);
await sql(`create schema ${q(SCHEMA)}; revoke all on schema ${q(SCHEMA)} from public, anon, authenticated;`);
console.log(`Schéma ${SCHEMA} créé. Lecture de ${DUMP} (${(statSync(DUMP).size / 1e9).toFixed(2)} Go)…`);

// ---------------------------------------------------------------------
// COPY en cours
// ---------------------------------------------------------------------
let copie = null; // { table, p, promesse, n }
const compteurs = new Map();

async function fermerCopie() {
  if (!copie) return;
  const c = copie;
  copie = null;
  c.p.stdin.end("\\.\n");
  await c.promesse;
  compteurs.set(c.table, (compteurs.get(c.table) ?? 0) + c.n);
  console.log(`  ${c.table} : ${compteurs.get(c.table)} lignes`);
}

function ouvrirCopie(table, colonnes) {
  const p = spawn("docker", [...PSQL, "-c", `copy ${q(SCHEMA)}.${q(table)} (${colonnes.map(q).join(", ")}) from stdin`], {
    stdio: ["pipe", "ignore", "pipe"],
  });
  let err = "";
  p.stderr.on("data", (d) => (err += d));
  const promesse = new Promise((resoudre, rejeter) => {
    p.on("close", (code) => (code === 0 ? resoudre() : rejeter(new Error(`COPY ${table} : ${err.trim()}`))));
  });
  copie = { table, p, promesse, n: 0, colonnes };
}

function ecrire(texte) {
  if (copie.p.stdin.write(texte)) return null;
  return new Promise((r) => copie.p.stdin.once("drain", r));
}

// ---------------------------------------------------------------------
// Boucle principale
// ---------------------------------------------------------------------
let enCreate = null; // { table, colonnes: [{nom, type}] }
let tableCourante = null; // table de l'INSERT en cours
let colonnesInsert = null;
let tablesVues = [];
let reste = Buffer.alloc(0);
let octetsLus = 0;
const taille = statSync(DUMP).size;
let dernierAffichage = Date.now();

async function traiterLigne(octets) {
  const l = octets.toString("latin1");

  if (enCreate) {
    if (l.startsWith(")")) {
      const t = enCreate;
      enCreate = null;
      if (!TABLES || TABLES.includes(t.table)) {
        const defs = t.colonnes.map((c) => {
          const ref = typesReference.get(`${t.table}.${c.nom}`);
          const type = ref ? ref : ENTIERS.test(c.type) ? "bigint" : "text";
          return `${q(c.nom)} ${type}`;
        });
        await sql(`create table ${q(SCHEMA)}.${q(t.table)} (${defs.join(", ")})`);
        tablesVues.push(t.table);
      }
      return;
    }
    const m = l.match(/^\s+`([^`]+)`\s+([a-zA-Z]+)/);
    if (m) enCreate.colonnes.push({ nom: m[1], type: m[2] });
    return;
  }

  if (l.startsWith("CREATE TABLE `")) {
    await fermerCopie();
    tableCourante = null;
    enCreate = { table: l.match(/^CREATE TABLE `([^`]+)`/)[1], colonnes: [] };
    return;
  }

  if (l.startsWith("INSERT INTO `")) {
    const m = l.match(/^INSERT INTO `([^`]+)` \(([^)]*)\) VALUES\s*(.*)$/s);
    if (!m) throw new Error(`INSERT illisible : ${l.slice(0, 120)}`);
    const table = m[1];
    const colonnes = m[2].split(",").map((c) => c.trim().replace(/^`|`$/g, ""));
    if (TABLES && !TABLES.includes(table)) { tableCourante = null; return; }
    if (!copie || copie.table !== table) {
      await fermerCopie();
      ouvrirCopie(table, colonnes);
    }
    tableCourante = table;
    colonnesInsert = colonnes;
    if (m[3].trim().startsWith("(")) await traiterValeurs(m[3]);
    return;
  }

  if (tableCourante && l.startsWith("(")) {
    await traiterValeurs(l);
    return;
  }
  // Tout le reste (commentaires, SET, ALTER TABLE, COMMIT…) est ignoré.
}

async function traiterValeurs(l) {
  const valeurs = lireLigne(l);
  if (valeurs.length !== colonnesInsert.length) {
    throw new Error(`${tableCourante} : ${valeurs.length} valeurs pour ${colonnesInsert.length} colonnes — ${l.slice(0, 200)}`);
  }
  copie.n++;
  const attente = ecrire(valeurs.map(pourCopy).join("\t") + "\n");
  if (attente) await attente;
}

for await (const morceau of createReadStream(DUMP, { highWaterMark: 4 << 20 })) {
  octetsLus += morceau.length;
  let tampon = reste.length ? Buffer.concat([reste, morceau]) : morceau;
  let debut = 0;
  for (;;) {
    const fin = tampon.indexOf(0x0a, debut);
    if (fin < 0) break;
    let ligne = tampon.subarray(debut, fin);
    if (ligne.length && ligne[ligne.length - 1] === 0x0d) ligne = ligne.subarray(0, -1);
    await traiterLigne(ligne);
    debut = fin + 1;
  }
  reste = Buffer.from(tampon.subarray(debut));
  if (Date.now() - dernierAffichage > 30000) {
    dernierAffichage = Date.now();
    console.log(`  … ${Math.round((octetsLus / taille) * 100)} %`);
  }
}
if (reste.length) await traiterLigne(reste);
await fermerCopie();

// ---------------------------------------------------------------------
// Index (ceux de la copie de septembre), droits, comparaison
// ---------------------------------------------------------------------
let index = [];
try {
  index = await sql(`select tablename, indexdef from pg_indexes where schemaname = '${REFERENCE}'`, { lignes: true });
} catch {}
let nIndex = 0;
for (const [table, def] of index) {
  if (!tablesVues.includes(table)) continue;
  const def2 = def
    .replace(/ ON \S+\./, ` ON ${q(SCHEMA)}.`)
    .replace(/INDEX (\S+) ON/, (_, nom) => `INDEX ${q(SCHEMA + "_" + nom.replace(/"/g, "")).slice(0, 63)} ON`);
  try { await sql(def2); nIndex++; } catch (e) { console.warn(`  index non recréé (${table}) : ${e.message.split("\n")[0]}`); }
}
await sql(`revoke all on all tables in schema ${q(SCHEMA)} from public, anon, authenticated`);

console.log(`\n${tablesVues.length} tables, ${nIndex} index. Lignes chargées, et pour comparaison la copie « ${REFERENCE} » :`);
for (const table of tablesVues) {
  let ref = "—";
  try { ref = await sql(`select count(*) from ${q(REFERENCE)}.${q(table)}`); } catch {}
  const n = compteurs.get(table) ?? 0;
  console.log(`  ${table.padEnd(22)} ${String(n).padStart(8)}   (septembre : ${ref})`);
}
console.log(`\nTerminé. Le schéma ${SCHEMA} est prêt pour : node scripts/reimporter-wfg1.mjs --source ${SCHEMA} --essai`);
