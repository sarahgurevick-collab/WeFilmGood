import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { echapper, envoyerEmail } from "@/lib/brevo";
import { gabarit } from "@/lib/lien-magique";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Changement d'adresse email (09/10/2026, Sarah) : une adresse spammée doit
 * pouvoir être remplacée. L'adresse est la clé du compte (c'est à elle que
 * part le lien de connexion), donc on ne la change pas comme une ville :
 *
 *  - le membre tape la nouvelle adresse ; un lien part dessus ; rien ne
 *    change tant qu'il n'a pas cliqué (jeton haché en base, 24 h, un usage) ;
 *  - l'administration change l'adresse d'un membre directement ;
 *  - l'ancienne adresse n'est pas prévenue (décision de Sarah).
 *
 * Dans les deux cas, la fiche de coordonnées réservée à l'équipe suit.
 */

const VALIDITE = 24 * 60 * 60_000;

export const ERREURS = {
  invalide: "Cette adresse email n'est pas valide.",
  memeAdresse: "C'est déjà votre adresse.",
  dejaUtilisee: "Cette adresse est déjà utilisée par un autre compte.",
  indisponible: "Le changement d'adresse est momentanément indisponible.",
  lienPerime: "Ce lien a expiré ou a déjà servi. Refaites la demande depuis votre profil.",
};

export function adresseValide(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

const hacher = (jeton: string) => createHash("sha256").update(jeton).digest("hex");

async function origineDuSite() {
  const h = await headers();
  const hote = h.get("host") ?? "app.wefilmgood.com";
  const protocole = h.get("x-forwarded-proto") ?? (hote.startsWith("localhost") ? "http" : "https");
  return `${protocole}://${hote}`;
}

/**
 * Applique le changement : le compte de connexion, puis les coordonnées
 * réservées à l'équipe. Renvoie un message d'erreur lisible, ou rien.
 */
export async function appliquerNouvelleAdresse(profileId: string, email: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return ERREURS.indisponible;

  const { error } = await admin.auth.admin.updateUserById(profileId, { email, email_confirm: true });
  if (error) {
    if (error.code === "email_exists" || /already|exists/i.test(error.message)) return ERREURS.dejaUtilisee;
    console.error("Changement d'adresse : échec", error.message);
    return ERREURS.indisponible;
  }
  await admin
    .from("profile_contact_info")
    .upsert({ profile_id: profileId, email, updated_at: new Date().toISOString() }, { onConflict: "profile_id" });
  return null;
}

/** Vérifications communes avant de changer : forme, différence, unicité. */
export async function verifierNouvelleAdresse(
  email: string,
  adresseActuelle: string | null | undefined,
): Promise<string | null> {
  if (!adresseValide(email)) return ERREURS.invalide;
  if (adresseActuelle && email === adresseActuelle.toLowerCase()) return ERREURS.memeAdresse;
  const admin = createAdminClient();
  if (!admin) return ERREURS.indisponible;
  const { data: prise } = await admin.rpc("adresse_deja_utilisee", { p_email: email });
  if (prise === true) return ERREURS.dejaUtilisee;
  return null;
}

/**
 * Le membre demande : on garde la demande (jeton haché) et on envoie le
 * lien de confirmation à la nouvelle adresse.
 */
export async function demanderChangementAdresse(
  profileId: string,
  prenom: string | null,
  email: string,
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return ERREURS.indisponible;

  const jeton = randomBytes(32).toString("hex");
  const { error } = await admin.from("email_changes").insert({
    profile_id: profileId,
    nouvelle_adresse: email,
    token_hash: hacher(jeton),
    expires_at: new Date(Date.now() + VALIDITE).toISOString(),
  });
  if (error) {
    console.error("Changement d'adresse : demande non enregistrée", error.message);
    return ERREURS.indisponible;
  }

  const lien = `${await origineDuSite()}/profil/adresse/confirmer?jeton=${jeton}`;
  const envoye = await envoyerEmail({
    to: [{ email, name: prenom ?? undefined }],
    subject: "Confirmez votre nouvelle adresse WeFilmGood",
    htmlContent: gabarit(
      prenom ? `Bonjour ${echapper(prenom)},` : "Bonjour,",
      "Vous avez demandé à utiliser cette adresse pour votre compte WeFilmGood. Un clic pour confirmer.",
      lien,
      "Confirmer ma nouvelle adresse",
    ),
  });
  return envoye ? null : ERREURS.indisponible;
}

/** La demande que désigne un jeton, si elle est encore valable. */
export async function lireDemande(jeton: string) {
  const admin = createAdminClient();
  if (!admin || !/^[0-9a-f]{64}$/.test(jeton)) return null;
  const { data } = await admin
    .from("email_changes")
    .select("id, profile_id, nouvelle_adresse, expires_at, used_at")
    .eq("token_hash", hacher(jeton))
    .maybeSingle<{ id: string; profile_id: string; nouvelle_adresse: string; expires_at: string; used_at: string | null }>();
  if (!data || data.used_at || new Date(data.expires_at).getTime() < Date.now()) return null;
  return data;
}

/** Au clic sur le lien : on applique, et le jeton ne sert plus. */
export async function confirmerChangementAdresse(jeton: string): Promise<{ ok: true; profileId: string; email: string } | { ok: false; erreur: string }> {
  const demande = await lireDemande(jeton);
  if (!demande) return { ok: false, erreur: ERREURS.lienPerime };
  const erreur = await appliquerNouvelleAdresse(demande.profile_id, demande.nouvelle_adresse);
  if (erreur) return { ok: false, erreur };
  const admin = createAdminClient();
  await admin?.from("email_changes").update({ used_at: new Date().toISOString() }).eq("id", demande.id);
  return { ok: true, profileId: demande.profile_id, email: demande.nouvelle_adresse };
}
