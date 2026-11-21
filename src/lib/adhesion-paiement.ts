import "server-only";

import { envoyerEmail } from "@/lib/brevo";
import { createAdminClient, emailDuMembre } from "@/lib/supabase/admin";
import { lireIntention, montantPaye, prelevementsRefuses } from "@/lib/helloasso";

/** L'adhésion au mois (15/11) : 12 paiements de 7 €, le premier tout de suite. */
export const ADHESION_AU_MOIS = { slug: "mois_7", premierCentimes: 700, suivantes: 11 } as const;

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
  // Au mois (15/11), le premier prélèvement de 7 € suffit : les suivants
  // sont prélevés par HelloAsso, mois après mois.
  const attendu = m.plan_slug === ADHESION_AU_MOIS.slug ? ADHESION_AU_MOIS.premierCentimes : (m.amount_cents ?? Infinity);
  if (paye < attendu) return "en_attente";

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
    // La facture est émise tout de suite ; si elle échoue, l'adhésion reste
    // active (le membre la retrouvera sur la page Adhésion une fois émise).
    let factureEmise = false;
    try {
      const { data: factureId } = await admin.rpc("creer_facture_adhesion", { p_membership: m.id });
      factureEmise = !!factureId;
    } catch (e) {
      console.error("facture d'adhésion", m.id, e);
    }
    const email = await emailDuMembre(m.profile_id);
    if (email) {
      await envoyerEmail({
        to: [{ email }],
        subject: "Votre adhésion WeFilmGood est active",
        htmlContent: `
          <p>Bonjour,</p>
          <p>Votre paiement est bien reçu : votre adhésion WeFilmGood est active pour un an, jusqu'au ${fin.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.</p>
          ${m.plan_slug === ADHESION_AU_MOIS.slug ? `<p>Les 7 € suivants seront prélevés chaque mois par HelloAsso, pendant 11 mois.</p>` : ""}
          ${factureEmise ? `<p>Votre facture est disponible sur WeFilmGood, dans <a href="https://app.wefilmgood.com/profil/compte">Réglages du compte</a>.</p>` : ""}
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

/** Le délai laissé au membre après un prélèvement refusé (Sarah, 21/11). */
const DELAI_IMPAYE_JOURS = 7;

/**
 * Le suivi des adhésions au mois (21/11) : HelloAsso prélève 7 € chaque
 * mois ; si un prélèvement est refusé, le jour est noté, et 7 jours plus
 * tard, sans régularisation, l'adhésion s'arrête (le membre perd ses
 * droits d'adhérent, ses projets restent visibles). Si le paiement finit
 * par passer, la note est effacée, et une adhésion arrêtée pour cette
 * raison repart. Une adhésion rétablie à la main par l'administration
 * n'est plus arrêtée toute seule.
 */
export async function suivrePrelevements() {
  const admin = createAdminClient();
  if (!admin) throw new Error("clé de service manquante");
  const maintenant = new Date();
  const { data: auMois } = await admin
    .from("memberships")
    .select("id, status, expires_at, payment_reference, prelevement_refuse_le, arretee_pour_impaye_le")
    .eq("plan_slug", ADHESION_AU_MOIS.slug)
    .eq("payment_provider", "helloasso")
    .not("payment_reference", "is", null)
    .in("status", ["active", "expiree"])
    .gt("expires_at", maintenant.toISOString());

  let refus = 0;
  let arretees = 0;
  let retablies = 0;
  for (const m of auMois ?? []) {
    // Une adhésion close pour une autre raison (par l'administration) ne nous regarde pas.
    if (m.status === "expiree" && !m.arretee_pour_impaye_le) continue;
    try {
      const refuses = prelevementsRefuses(await lireIntention(m.payment_reference!));
      const journal = (type: string, payload: Record<string, unknown> = {}) =>
        admin.from("membership_events").insert({ membership_id: m.id, event_type: type, payload });

      if (refuses.length > 0) {
        if (m.status !== "active") continue;
        if (!m.prelevement_refuse_le) {
          await admin
            .from("memberships")
            .update({ prelevement_refuse_le: maintenant.toISOString(), updated_at: maintenant.toISOString() })
            .eq("id", m.id);
          await journal("prelevement_refuse", { paiements: refuses.map((p) => ({ id: p.id, etat: p.state, date: p.date })) });
          refus++;
        } else if (
          !m.arretee_pour_impaye_le &&
          maintenant.getTime() - new Date(m.prelevement_refuse_le).getTime() > DELAI_IMPAYE_JOURS * 24 * 3600 * 1000
        ) {
          await admin
            .from("memberships")
            .update({ status: "expiree", arretee_pour_impaye_le: maintenant.toISOString(), updated_at: maintenant.toISOString() })
            .eq("id", m.id)
            .eq("status", "active");
          await journal("arret_pour_impaye");
          arretees++;
        }
      } else if (m.prelevement_refuse_le) {
        // Régularisé : plus aucun prélèvement refusé chez HelloAsso.
        const repart = m.status === "expiree" && !!m.arretee_pour_impaye_le;
        await admin
          .from("memberships")
          .update({
            prelevement_refuse_le: null,
            arretee_pour_impaye_le: null,
            ...(repart ? { status: "active" } : {}),
            updated_at: maintenant.toISOString(),
          })
          .eq("id", m.id);
        await journal("prelevement_regularise", { adhesion_retablie: repart });
        if (repart) retablies++;
      }
    } catch (e) {
      // Une référence illisible (paiement d'essai, HelloAsso indisponible) : on repassera.
      console.error("suivi des prélèvements", m.id, e);
    }
  }
  return { suivies: auMois?.length ?? 0, refus, arretees, retablies };
}
