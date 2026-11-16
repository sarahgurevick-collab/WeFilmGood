// Les listes par métier dans Brevo (16/11/2026, Sarah) : une liste par
// métier, remplie avec les membres de WFG 2, pour que Nicolas envoie ses
// campagnes depuis Brevo (news.wefilmgood.com) à un métier précis.
//
// Les listes de Nicolas (contacts extérieurs à WeFilmGood) ne sont jamais
// touchées : celles-ci sont rangées dans un dossier à part, et leur nom
// commence par « WFG 2 – ».
//
// Relançable : node scripts/brevo-listes-metiers.mjs
//  - les listes existantes sont réutilisées, les nouveaux membres ajoutés ;
//  - les membres désinscrits des mailings sur WFG 2 en sont retirés ;
//  - mêmes exclusions que les mailings du site (fonction
//    mailing_destinataires) : lecteurs, adresses fictives, désinscrits.
// Un membre qui change de métier n'est pas retiré de son ancienne liste.

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

// Les désinscrits de WFG 2, à retirer des listes où ils seraient encore.
const { data: desinscrits } = await supabase.from("mailing_desinscriptions").select("profile_id").eq("source", "lien");
const emailsDesinscrits = [];
for (const d of desinscrits ?? []) {
  const { data } = await supabase.auth.admin.getUserById(d.profile_id);
  if (data?.user?.email) emailsDesinscrits.push(data.user.email);
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

  for (let i = 0; i < emailsDesinscrits.length; i += 150) {
    await brevo(`/contacts/lists/${liste.id}/contacts/remove`, {
      method: "POST",
      body: { emails: emailsDesinscrits.slice(i, i + 150) },
    }).catch(() => {}); // aucun d'eux dans la liste : Brevo répond par une erreur, sans gravité
  }

  bilan.push({ liste: nom, id: liste.id, membres: membres.length, import: import_.processId });
  console.log(`${nom} : ${membres.length} membres envoyés (liste ${liste.id}, import ${import_.processId})`);
}
console.log(JSON.stringify(bilan));
