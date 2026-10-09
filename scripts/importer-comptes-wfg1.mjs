// Reprise des comptes de WFG 1 qui n'avaient pas été importés le 19/09
// (l'import n'avait pris que les comptes ayant au moins un projet) :
// producteurs, réalisateurs, comédiens, compositeurs, auteurs sans
// projet… Décision de Sarah, 26/09/2026.
//
// Entrée : ~/imports/comptes-a-importer.json, exporté depuis wfg1.accounts
// (hors lecteurs et admin, hors adresses invalides, hors les 21 adresses
// en double laissées de côté, hors adresses déjà inscrites sur WFG 2).
//
// Même façon de faire que le 19/09 : un compte d'authentification (email
// confirmé, aucun email envoyé — la personne reçoit son lien magique le
// jour où elle se connecte), métadonnées legacy_id / imported_from ; le
// déclencheur crée le profil, qu'on complète ensuite (ville, pays,
// biofilmo, legacy_id). Idempotent : un legacy_id déjà présent est sauté.
//
// Lancement : node scripts/importer-comptes-wfg1.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

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

async function toutLire(construire) {
  const tout = [];
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await construire().range(debut, debut + 999);
    if (error) throw error;
    tout.push(...data);
    if (data.length < 1000) return tout;
  }
}

const comptes = JSON.parse(readFileSync(process.argv[2] ?? "/home/wfg/imports/comptes-a-importer.json", "utf8"));
const existants = await toutLire(() =>
  supabase.from("profiles").select("legacy_id").not("legacy_id", "is", null).order("id"),
);
const dejaLa = new Set(existants.map((p) => p.legacy_id));
// Comptes de WFG 1 à ne jamais reprendre (décision de Sarah, 03/10/2026) :
// 3866 = « David David », compte de test banni en 2019, supprimé de WFG 2.
// 08/10/2026 (Sarah) : doublons d'un même talent qui n'avait pas reçu son mail de
// validation et s'est réinscrit plusieurs fois — 8144, 10560, 10563 (Fakhrya,
// fakhrya@jomproductions.com ; le bon profil est fakhrya.jomproductions@gmail.com)
// et 4627 (Clément Raynaud, ancien compte « Auteur de BD » supprimé ; le bon est 5477).
for (const id of ["3866", "8144", "10560", "10563", "4627"]) dejaLa.add(id);

let crees = 0, sautes = 0, echoues = 0;
const debut = Date.now();
for (const a of comptes) {
  const legacyId = String(a.user_id);
  if (dejaLa.has(legacyId)) { sautes++; continue; }

  const prenom = (a.first_name ?? "").trim() || null;
  const nom = (a.last_name ?? "").trim() || null;
  // Attaque du 1er au 8 juin 2026 sur WFG 1 : 762 faux comptes « scénariste »
  // (ids 13072 à 13869, prénom = nom = « Dg54asdkfoda+- »), supprimés de WFG 2
  // le 09/10/2026. On les reconnaît au nom, pas aux ids : 6 vrais auteurs se
  // sont inscrits dans la même plage.
  if (prenom === "Dg54asdkfoda+-" || nom === "Dg54asdkfoda+-") { sautes++; continue; }
  const complet = [prenom, nom].filter(Boolean).join(" ") || null;

  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: a.email,
      email_confirm: true,
      user_metadata: {
        legacy_id: legacyId,
        imported_from: "ancienne_plateforme",
        full_name: complet,
        first_name: prenom,
        last_name: nom,
      },
    });
    if (error) throw error;
    const id = data.user.id;
    const { error: err2 } = await supabase
      .from("profiles")
      .update({
        full_name: complet,
        first_name: prenom,
        last_name: nom,
        city: (a.city ?? "").trim() || null,
        country: (a.country ?? "").trim() || null,
        biofilmo: (a.biofilmo_fr ?? "").trim() || null,
        legacy_id: legacyId,
        legacy_user_id: a.user_id,
        ...(a.registration_date ? { created_at: a.registration_date } : {}),
      })
      .eq("id", id);
    if (err2) throw err2;
    crees++;
    dejaLa.add(legacyId);
  } catch (e) {
    echoues++;
    console.error("compte", legacyId, a.email, e.message ?? e);
  }
  if ((crees + sautes + echoues) % 500 === 0) {
    console.log(`… ${crees} créés, ${sautes} déjà là, ${echoues} échoués (${Math.round((Date.now() - debut) / 1000)} s)`);
  }
}
console.log(`comptes : ${crees} créés, ${sautes} déjà présents, ${echoues} échoués — sur ${comptes.length}`);
