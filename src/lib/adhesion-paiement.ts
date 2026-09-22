import "server-only";

import { envoyerEmail } from "@/lib/brevo";
import { createAdminClient, emailDuMembre } from "@/lib/supabase/admin";
import { lireIntention, montantPaye } from "@/lib/helloasso";

/**
 * Vérifie une adhésion en attente de paiement et l'active si HelloAsso
 * confirme l'encaissement du bon montant. Appelée par la page de retour,
 * par la notification de HelloAsso et par le rattrapage horaire : les
 * trois peuvent se croiser sans risque, une adhésion déjà active n'est
 * pas retouchée.
 */
export async function verifierAdhesion(membershipId: string): Promise<"active" | "en_attente" | "introuvable"> {
  const admin = createAdminClient();
  if (!admin) throw new Error("clé de service manquante");

  const { data: m } = await admin
    .from("memberships")
    .select("id, profile_id, plan_slug, status, amount_cents, payment_provider, payment_reference")
    .eq("id", membershipId)
    .maybeSingle();
  if (!m) return "introuvable";
  if (m.status === "active") return "active";
  if (m.payment_provider !== "helloasso" || !m.payment_reference) return "en_attente";

  const intention = await lireIntention(m.payment_reference);
  const paye = montantPaye(intention);
  if (paye < (m.amount_cents ?? Infinity)) return "en_attente";

  const debut = new Date();
  const fin = new Date(debut);
  fin.setFullYear(fin.getFullYear() + 1);

  // Seule une adhésion encore en attente passe active : si deux
  // vérifications arrivent en même temps, la seconde ne fait rien.
  const { data: activee } = await admin
    .from("memberships")
    .update({
      status: "active",
      started_at: debut.toISOString(),
      expires_at: fin.toISOString(),
      updated_at: debut.toISOString(),
    })
    .eq("id", m.id)
    .eq("status", "en_attente_paiement")
    .select("id")
    .maybeSingle();

  if (activee) {
    const email = await emailDuMembre(m.profile_id);
    if (email) {
      await envoyerEmail({
        to: [{ email }],
        subject: "Votre adhésion WeFilmGood est active",
        htmlContent: `
          <p>Bonjour,</p>
          <p>Votre paiement est bien reçu : votre adhésion WeFilmGood est active pour un an, jusqu'au ${fin.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.</p>
          <p>Merci de votre soutien.</p>
        `,
      });
    }
  }
  return "active";
}

/** Revérifie les adhésions en attente des deux derniers jours. */
export async function rattraperAdhesions() {
  const admin = createAdminClient();
  if (!admin) throw new Error("clé de service manquante");
  const depuis = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { data: enAttente } = await admin
    .from("memberships")
    .select("id")
    .eq("status", "en_attente_paiement")
    .eq("payment_provider", "helloasso")
    .not("payment_reference", "is", null)
    .gte("created_at", depuis);

  let activees = 0;
  for (const m of enAttente ?? []) {
    try {
      if ((await verifierAdhesion(m.id)) === "active") activees++;
    } catch (e) {
      console.error("rattrapage adhésion", m.id, e);
    }
  }
  return { verifiees: enAttente?.length ?? 0, activees };
}
