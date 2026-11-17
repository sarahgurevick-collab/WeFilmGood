import "server-only";
import { echapper, envoyerEmail } from "@/lib/brevo";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Prévient l'auteur que la fiche de lecture de son projet est prête
 * (17/11). Envoyé une seule fois, à la première publication.
 *
 * TEXTE EN ATTENTE DE VALIDATION PAR SARAH : tant que FICHE_PRETE_EMAIL
 * n'est pas à « oui » dans .env.local, rien n'est envoyé.
 *
 * Ni la note ni le label ne figurent dans l'email : l'auteur les découvre
 * en se connectant. Le lien mène à la page de connexion (un lien magique
 * expirerait avant que l'auteur n'ouvre le message).
 */
export async function prevenirAuteurFichePrete(projectId: string) {
  if (process.env.FICHE_PRETE_EMAIL !== "oui") return;

  const admin = createAdminClient();
  if (!admin) return;

  const { data: projet } = await admin
    .from("projects")
    .select("title, owner_id, owner:profiles!projects_owner_id_fkey(full_name)")
    .eq("id", projectId)
    .maybeSingle<{ title: string; owner_id: string; owner: { full_name: string | null } | null }>();
  if (!projet) return;

  const { data: compte } = await admin.auth.admin.getUserById(projet.owner_id);
  const email = compte.user?.email;
  if (!email) return;

  const prenom = projet.owner?.full_name?.trim().split(/\s+/)[0] ?? "";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.wefilmgood.com";

  await envoyerEmail({
    to: [{ email }],
    subject: `La fiche de lecture de « ${projet.title} » est prête`,
    htmlContent: `
    <div style="font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; max-width: 520px;">
      <p style="font-size: 17px; font-weight: 600;">Bonjour${prenom ? ` ${echapper(prenom)}` : ""},</p>
      <p>La fiche de lecture de votre projet « ${echapper(projet.title)} » est disponible sur WeFilmGood.</p>
      <p>Pour la lire, connectez-vous avec cette adresse email : un lien de connexion vous sera envoyé.</p>
      <p style="margin: 28px 0;">
        <a href="${site}/connexion" style="background: #DA2C25; color: #fff; padding: 12px 22px; border-radius: 6px; text-decoration: none; font-weight: 600;">Lire ma fiche</a>
      </p>
      <p style="font-size: 13px; color: #666;">— WeFilmGood</p>
    </div>`,
  });
}
