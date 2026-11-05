// Prépare un compte WFG 2 pour chaque ancien lecteur de WFG 1 qui n'en a pas
// (05/11/2026, Sarah : « il n'y a aucune différence entre les 15 premiers
// lecteurs et les autres, ils peuvent revenir lire à n'importe quel moment »).
// Même chose que le bouton « Réactiver ce lecteur » : compte confirmé, AUCUN
// email envoyé, ville/pays/biofilmo repris s'ils sont vides, rôle lecteur,
// profil lecteur, fiche WFG 1 marquée comme reprise. Laissés de côté : les
// comptes supprimés, les comptes « Clermont » de test, les membres supprimés.
//   node scripts/preparer-anciens-lecteurs.mjs [--ecrire]
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const ECRIRE = process.argv.includes("--ecrire");
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const sql = (q) =>
  JSON.parse(execFileSync("docker", ["exec", "supabase-db", "psql", "-U", "postgres", "-At", "-c", q], { encoding: "utf8" }).trim() || "[]");

const anciens = sql(`with ids as (
    select legacy_user_id id from legacy_profiles where role_slug = 'lecteur'
    union select reader_legacy_id from legacy_reading_reports where statut <> 0 and reader_legacy_id is not null)
  select coalesce(json_agg(json_build_object('id', lp.legacy_user_id, 'email', lp.email, 'full_name', lp.full_name,
    'city', lp.city, 'country', lp.country, 'biofilmo', lp.biofilmo,
    'uid', (select u.id from auth.users u where lower(u.email) = lower(lp.email) limit 1)) order by lp.legacy_user_id), '[]')
  from ids join legacy_profiles lp on lp.legacy_user_id = ids.id
  where not exists (select 1 from profiles p where p.legacy_user_id = ids.id)
    and coalesce(trim(lp.email), '') <> '' and lp.email not ilike '%@sans-adresse%'
    and lp.full_name not ilike 'clermont%'
    and not exists (select 1 from membres_supprimes m where m.legacy_user_id = ids.id or lower(m.email) = lower(lp.email))`);

console.log(`${anciens.length} lecteurs à préparer (${anciens.filter((a) => a.uid).length} ont déjà un compte avec la même adresse).`);
if (!ECRIRE) {
  for (const a of anciens) console.log(`${a.id} ${a.full_name} <${a.email}>${a.uid ? " (compte existant)" : ""}`);
  console.log("Aperçu seulement (ajouter --ecrire pour écrire).");
  process.exit(0);
}

let faits = 0;
const erreurs = [];
for (const a of anciens) {
  try {
    let uid = a.uid;
    if (!uid) {
      const [prenom, ...reste] = (a.full_name ?? "").trim().split(/\s+/);
      const { data, error } = await supabase.auth.admin.createUser({
        email: a.email.trim(),
        email_confirm: true,
        user_metadata: {
          first_name: prenom,
          last_name: reste.join(" "),
          full_name: a.full_name,
          legacy_id: a.id,
          imported_from: "ancienne_plateforme",
        },
      });
      if (error) throw new Error(error.message);
      uid = data.user.id;
    }
    const { data: profil } = await supabase.from("profiles").select("city, country, biofilmo, legacy_user_id").eq("id", uid).maybeSingle();
    let r = await supabase
      .from("profiles")
      .update({
        city: profil?.city ?? a.city,
        country: profil?.country ?? a.country,
        biofilmo: profil?.biofilmo ?? a.biofilmo,
        legacy_user_id: profil?.legacy_user_id ?? a.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", uid);
    if (r.error) throw new Error(r.error.message);
    if (profil?.legacy_user_id && profil.legacy_user_id !== a.id)
      erreurs.push(`${a.full_name} : compte déjà relié à un autre identifiant WFG 1 (${profil.legacy_user_id})`);
    r = await supabase.from("profile_roles").upsert({ profile_id: uid, role_slug: "lecteur" });
    if (r.error) throw new Error(r.error.message);
    r = await supabase.from("reader_profiles").upsert({ profile_id: uid }, { onConflict: "profile_id" });
    if (r.error) throw new Error(r.error.message);
    await supabase
      .from("legacy_profiles")
      .update({ claimed_by: uid, claimed_at: new Date().toISOString() })
      .eq("legacy_user_id", a.id)
      .is("claimed_by", null);
    faits++;
  } catch (e) {
    erreurs.push(`${a.id} ${a.full_name} <${a.email}> : ${e.message}`);
  }
}
console.log(`${faits} lecteurs préparés.`);
for (const e of erreurs) console.log("! " + e);
