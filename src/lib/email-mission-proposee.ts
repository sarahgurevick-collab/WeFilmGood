import "server-only";
import { echapper, envoyerEmail } from "@/lib/brevo";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Prévient un lecteur qu'un projet lui est proposé (17/11).
 *
 * TEXTE EN ATTENTE DE VALIDATION PAR SARAH : tant que MISSION_EMAIL n'est
 * pas à « oui » dans .env.local, rien n'est envoyé.
 *
 * Ni le nom de l'auteur ni le résumé n'y figurent : le lecteur découvre
 * le projet dans son espace, comme avant.
 */
export async function prevenirLecteurMission(readerId: string, projectId: string) {
  if (process.env.MISSION_EMAIL !== "oui") return;

  const admin = createAdminClient();
  if (!admin) return;

  const [{ data: compte }, { data: lecteur }, { data: projet }] = await Promise.all([
    admin.auth.admin.getUserById(readerId),
    admin.from("profiles").select("full_name").eq("id", readerId).maybeSingle<{ full_name: string | null }>(),
    admin.from("projects").select("title").eq("id", projectId).maybeSingle<{ title: string }>(),
  ]);
  const email = compte.user?.email;
  if (!email || !projet) return;

  const prenom = lecteur?.full_name?.trim().split(/\s+/)[0] ?? "";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.wefilmgood.com";

  await envoyerEmail({
    to: [{ email }],
    subject: "Un projet vous est proposé à la lecture",
    htmlContent: `
    <div style="font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; max-width: 520px;">
      <p style="font-size: 17px; font-weight: 600;">Bonjour${prenom ? ` ${echapper(prenom)}` : ""},</p>
      <p>Le projet « ${echapper(projet.title)} » vous est proposé à la lecture.</p>
      <p>Connectez-vous à votre espace lecteur pour l'accepter ou le refuser.</p>
      <p style="margin: 28px 0;">
        <a href="${site}/lecteur" style="background: #DA2C25; color: #fff; padding: 12px 22px; border-radius: 6px; text-decoration: none; font-weight: 600;">Voir le projet</a>
      </p>
      <p style="font-size: 13px; color: #666;">— WeFilmGood</p>
    </div>`,
  });
}
