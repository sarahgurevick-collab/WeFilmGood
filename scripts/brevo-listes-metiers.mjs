// Les listes par métier dans Brevo (16/11/2026, Sarah) : une liste par
// métier, remplie avec les membres de WFG 2, pour que Nicolas envoie ses
// campagnes depuis Brevo (news.wefilmgood.com) à un métier précis.
//
// Les listes de Nicolas (contacts extérieurs à WeFilmGood) ne sont jamais
// touchées : celles-ci sont rangées dans un dossier à part, et leur nom
// commence par « WFG 2 – ».
//
// Lancé chaque nuit (crontab, 3 h 40 UTC) : node scripts/brevo-listes-metiers.mjs
//  - les listes existantes sont réutilisées, les nouveaux membres ajoutés ;
//  - ceux qui n'y ont plus leur place en sont retirés (désinscrit sur
//    WFG 2, métier changé, compte supprimé) : chaque liste est le reflet
//    exact du site ;
//  - mêmes exclusions que les mailings du site (fonction
//    mailing_destinataires) : lecteurs, adresses fictives, désinscrits.
// Garde-fou : si plus d'un cinquième d'une liste devait partir d'un coup,
// rien n'est retiré (une lecture ratée de la base ne vide pas les listes).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const DOSSIER = "WFG 2 – Membres du site";
const PREFIXE = "WFG 2 – ";

async function brevo(chemin, options = {}) {
  const r = await fetch(`https://api.brevo.com/v3${chemin}`, {
    ...options,
    headers: { "api-key": env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const texte = await r.text();
  const json = texte ? JSON.parse(texte) : {};
  if (!r.ok) throw Object.assign(new Error(`${chemin} : ${r.status} ${texte.slice(0, 200)}`), { status: r.status });
  return json;
}

async function tout(rpc, params) {
  const lignes = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await supabase.rpc(rpc, params).order("profile_id").range(debut, debut + 999);
    if (error) throw error;
    lignes.push(...data);
    if (data.length < 1000) return lignes;
  }
}

// Le dossier à part.
const { folders = [] } = await brevo("/contacts/folders?limit=50");
let dossier = folders.find((f) => f.name === DOSSIER);
if (!dossier) dossier = await brevo("/contacts/folders", { method: "POST", body: { name: DOSSIER } });
console.log(`Dossier « ${DOSSIER} » : ${dossier.id}`);

const { lists: existantes = [] } = await brevo(`/contacts/folders/${dossier.id}/lists?limit=50`);

/** Les adresses déjà dans une liste Brevo. */
async function contactsDeLaListe(id) {
  const emails = [];
  for (let debut = 0; ; debut += 500) {
    const { contacts = [] } = await brevo(`/contacts/lists/${id}/contacts?limit=500&offset=${debut}`);
    emails.push(...contacts.map((c) => c.email).filter(Boolean));
    if (contacts.length < 500) return emails;
  }
}

const { data: roles } = await supabase.from("roles").select("slug, label_fr").neq("slug", "lecteur").order("position");
const bilan = [];
for (const role of roles) {
  const membres = await tout("mailing_destinataires", { p_categories: [], p_metiers: [role.slug], p_langues: [] });
  if (membres.length === 0) continue;

  const nom = `${PREFIXE}${role.label_fr}`;
  let liste = existantes.find((l) => l.name === nom);
  if (!liste) liste = await brevo("/contacts/lists", { method: "POST", body: { name: nom, folderId: dossier.id } });

  const import_ = await brevo("/contacts/import", {
    method: "POST",
    body: {
      listIds: [liste.id],
      updateExistingContacts: true,
      emptyContactsAttributes: false,
      jsonBody: membres.map((m) => ({ email: m.email, attributes: m.prenom ? { PRENOM: m.prenom } : {} })),
    },
  });

  // Ceux qui sont dans la liste Brevo mais plus parmi les membres du métier.
  const attendus = new Set(membres.map((m) => m.email.toLowerCase()));
  const enTrop = (await contactsDeLaListe(liste.id)).filter((e) => !attendus.has(e.toLowerCase()));
  let retires = 0;
  if (enTrop.length > attendus.size / 5) {
    console.log(`${nom} : ${enTrop.length} contacts en trop, c'est anormal — rien n'est retiré.`);
  } else {
    for (let i = 0; i < enTrop.length; i += 150) {
      await brevo(`/contacts/lists/${liste.id}/contacts/remove`, {
        method: "POST",
        body: { emails: enTrop.slice(i, i + 150) },
      });
      retires += Math.min(150, enTrop.length - i);
    }
  }

  bilan.push({ liste: nom, id: liste.id, membres: membres.length, retires, import: import_.processId });
  console.log(`${nom} : ${membres.length} membres, ${retires} retirés (liste ${liste.id}, import ${import_.processId})`);
}
console.log(`${new Date().toISOString()} — ${bilan.length} listes mises à jour.`);
