import "server-only";

import { headers } from "next/headers";
import { echapper, envoyerEmail } from "@/lib/brevo";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Connexion et inscription sans mot de passe : on reçoit un lien par email.
 *
 * Le lien est fabriqué ici, avec la clé de service, puis envoyé par Brevo —
 * pas par Supabase. Son service d'envoi intégré plafonne à quelques emails
 * par heure pour tout le site, ce qui bloquerait la connexion des membres.
 *
 * Le lien pointe vers /auth/confirm, qui demande un clic avant d'ouvrir la
 * session : certaines messageries « visitent » les liens reçus pour les
 * analyser, ce qui suffirait à consommer un lien à usage unique.
 */

/** Un chemin interne au site, jamais une adresse extérieure. */
export function cheminSur(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

async function origineDuSite() {
  const h = await headers();
  const hote = h.get("host") ?? "app.wefilmgood.com";
  const protocole = h.get("x-forwarded-proto") ?? (hote.startsWith("localhost") ? "http" : "https");
  return `${protocole}://${hote}`;
}

// Empêche de bombarder une adresse de liens en cliquant en boucle.
const derniersEnvois = new Map<string, number>();
const DELAI_ENTRE_DEUX_ENVOIS = 60_000;

function tropTot(email: string) {
  const maintenant = Date.now();
  const dernier = derniersEnvois.get(email);
  if (dernier && maintenant - dernier < DELAI_ENTRE_DEUX_ENVOIS) return true;
  derniersEnvois.set(email, maintenant);
  return false;
}

async function lienVers(tokenHash: string, type: "magiclink" | "invite", next: string) {
  const params = new URLSearchParams({ token_hash: tokenHash, type, next: cheminSur(next) });
  return `${await origineDuSite()}/auth/confirm?${params.toString()}`;
}

function gabarit(titre: string, texte: string, lien: string, bouton: string) {
  return `
    <div style="font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; max-width: 520px;">
      <p style="font-size: 17px; font-weight: 600;">${titre}</p>
      <p>${texte}</p>
      <p style="margin: 28px 0;">
        <a href="${lien}" style="background: #DA2C25; color: #fff; padding: 12px 22px; border-radius: 6px; text-decoration: none; font-weight: 600;">${bouton}</a>
      </p>
      <p style="font-size: 13px; color: #666;">
        Ce lien ne sert qu'une fois et expire au bout d'une heure.
        Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.
      </p>
      <p style="font-size: 13px; color: #666;">— WeFilmGood</p>
    </div>
  `;
}

/**
 * Envoie un lien de connexion à un compte existant. Ne fait rien si
 * l'adresse est inconnue : l'écran affiché reste le même dans les deux cas,
 * pour ne pas révéler qui est inscrit.
 */
export async function envoyerLienDeConnexion(email: string, next: string) {
  if (tropTot(email)) return;

  const admin = createAdminClient();
  if (!admin) {
    console.error("Lien magique : SUPABASE_SERVICE_ROLE_KEY manquante");
    return;
  }

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) return;

  // Selon sa version, Supabase peut créer le compte au passage si l'adresse
  // est inconnue. Se connecter ne doit jamais inscrire personne : on défait.
  const u = data.user;
  const vientDEtreCree = !u.last_sign_in_at && Date.now() - new Date(u.created_at).getTime() < 15_000;
  if (vientDEtreCree) {
    await admin.auth.admin.deleteUser(u.id);
    return;
  }

  await envoyerEmail({
    to: [{ email }],
    subject: "Votre lien de connexion à WeFilmGood",
    htmlContent: gabarit(
      "Bonjour,",
      "Voici votre lien pour vous connecter à WeFilmGood.",
      await lienVers(data.properties.hashed_token, "magiclink", next),
      "Me connecter",
    ),
  });
}

/**
 * Crée le compte (sans mot de passe) et envoie le lien qui l'active.
 * Si l'adresse a déjà un compte, on envoie simplement un lien de connexion.
 * `donnees` part dans les métadonnées lues par le déclencheur qui crée le profil.
 */
export async function envoyerLienDInscription(
  email: string,
  nom: string,
  donnees: Record<string, string>,
  next: string,
): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const admin = createAdminClient();
  if (!admin) {
    console.error("Lien magique : SUPABASE_SERVICE_ROLE_KEY manquante");
    return { ok: false, erreur: "L'inscription est momentanément indisponible." };
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { full_name: nom, ...donnees } },
  });

  if (error) {
    if (error.code === "email_exists" || /already (been )?registered|already exists/i.test(error.message)) {
      await envoyerLienDeConnexion(email, next);
      return { ok: true };
    }
    if (/valid.*email|email.*invalid/i.test(error.message)) {
      return { ok: false, erreur: "Cette adresse email n'est pas valide." };
    }
    console.error("Lien magique : échec de l'inscription", error.message);
    return { ok: false, erreur: "L'inscription a échoué. Réessayez dans un instant." };
  }

  if (tropTot(email)) return { ok: true };

  await envoyerEmail({
    to: [{ email, name: nom }],
    subject: "Bienvenue sur WeFilmGood — activez votre profil",
    htmlContent: gabarit(
      `Bonjour ${echapper(nom)},`,
      "Bienvenue sur WeFilmGood ! Il ne reste qu'un clic pour activer votre profil.",
      await lienVers(data.properties.hashed_token, "invite", next),
      "Activer mon profil",
    ),
  });

  return { ok: true };
}
