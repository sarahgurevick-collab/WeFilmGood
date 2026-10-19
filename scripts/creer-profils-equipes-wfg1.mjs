// Profils en attente pour les talents des équipes de WFG 1 qui n'ont pas de
// compte (décision de Sarah, 19/10/2026) : un auteur avait saisi leur adresse
// e-mail et un métier, ils ne s'étaient jamais inscrits. Même façon de faire
// que la reprise des comptes (importer-comptes-wfg1.mjs) : un compte
// d'authentification, adresse confirmée, AUCUN e-mail envoyé ; la personne
// reçoit son lien magique le jour où elle se connecte. Le déclencheur crée le
// profil (sans nom, sans catégorie), puis 0166 le rattache à ses projets.
// On y ajoute le métier du rattachement. Sarah complète prénom et nom quand
// elle connaît la personne.
//
// Idempotent : une adresse qui a déjà un compte est sautée.
// Lancement : node scripts/creer-profils-equipes-wfg1.mjs [--a-blanc]
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const aBlanc = process.argv.includes("--a-blanc");
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: liens, error } = await supabase
  .from("project_co_authors")
  .select("id, project_id, invited_email, role_slug")
  .is("profile_id", null)
  .eq("status", "accepte")
  .limit(5000);
if (error) throw error;

const { data: supprimes } = await supabase.from("membres_supprimes").select("email");
const emailsSupprimes = new Set((supprimes ?? []).map((m) => (m.email ?? "").toLowerCase()).filter(Boolean));

const parAdresse = new Map();
for (const l of liens) {
  const e = l.invited_email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e) || emailsSupprimes.has(e)) continue;
  parAdresse.set(e, [...(parAdresse.get(e) ?? []), l]);
}
console.log(`${parAdresse.size} adresses pour ${liens.length} liens`);
if (aBlanc) process.exit(0);

let crees = 0, echoues = 0;
for (const [email, ls] of parAdresse) {
  try {
    const { data, error: e1 } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { imported_from: "equipe_wfg1" },
    });
    if (e1) throw e1;
    const id = data.user.id;
    const metiers = [...new Set(ls.map((l) => l.role_slug).filter(Boolean))];
    if (metiers.length) {
      const { error: e2 } = await supabase
        .from("profile_roles")
        .upsert(metiers.map((m) => ({ profile_id: id, role_slug: m })), { onConflict: "profile_id,role_slug", ignoreDuplicates: true });
      if (e2) throw e2;
    }
    // Le déclencheur z_rattacher_equipes a déjà fait le lien ; on vérifie.
    const { error: e3 } = await supabase
      .from("project_co_authors")
      .update({ profile_id: id })
      .in("id", ls.map((l) => l.id))
      .is("profile_id", null);
    if (e3) throw e3;
    crees++;
  } catch (e) {
    echoues++;
    console.error(email, e.message ?? e);
  }
}
console.log(`${crees} profils créés, ${echoues} échoués`);
