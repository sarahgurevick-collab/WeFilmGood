import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { lireIntention, montantPaye } from "@/lib/helloasso";

/**
 * La lecture payée (09/11/2026, Sarah : « Il y a un coût pour chaque
 * lecture de 50 euros […] on envoie son scénario en payant 50 euros. Le
 * payement se fait via Hello asso »), adhérent ou non.
 *
 * Même prudence que pour l'adhésion : une demande n'est tenue pour payée
 * qu'après avoir relu le paiement chez HelloAsso. La page de retour, la
 * notification et le rattrapage horaire peuvent se croiser sans risque.
 */
export const PRIX_LECTURE_CENTIMES = 5000;

export async function verifierDemandeLecture(
  demandeId: string,
): Promise<"payee" | "en_attente" | "introuvable"> {
  const admin = createAdminClient();
  if (!admin) throw new Error("clé de service manquante");

  const { data: d } = await admin
    .from("lecture_demandes")
    .select("id, status, amount_cents, payment_provider, payment_reference")
    .eq("id", demandeId)
    .maybeSingle();
  if (!d) return "introuvable";
  if (d.status === "payee") return "payee";
  if (d.payment_provider !== "helloasso" || !d.payment_reference) return "en_attente";

  const intention = await lireIntention(d.payment_reference);
  if (montantPaye(intention) < (d.amount_cents ?? Infinity)) return "en_attente";

  // Seule une demande encore en attente passe payée : si deux
  // vérifications arrivent en même temps, la seconde ne fait rien.
  await admin
    .from("lecture_demandes")
    .update({ status: "payee", paid_at: new Date().toISOString() })
    .eq("id", d.id)
    .eq("status", "en_attente_paiement");
  return "payee";
}

/** Revérifie les demandes de lecture en attente des deux derniers jours. */
export async function rattraperDemandesLecture() {
  const admin = createAdminClient();
  if (!admin) throw new Error("clé de service manquante");
  const depuis = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { data: enAttente } = await admin
    .from("lecture_demandes")
    .select("id")
    .eq("status", "en_attente_paiement")
    .eq("payment_provider", "helloasso")
    .not("payment_reference", "is", null)
    .gte("created_at", depuis);

  let payees = 0;
  for (const d of enAttente ?? []) {
    try {
      if ((await verifierDemandeLecture(d.id)) === "payee") payees++;
    } catch (e) {
      console.error("rattrapage lecture", d.id, e);
    }
  }
  return { verifiees: enAttente?.length ?? 0, payees };
}
