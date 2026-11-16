import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { lireIntention, montantPaye } from "@/lib/helloasso";

/**
 * Le Pack Soleils (16/11/2026, Sarah : « construis-le »). Les prix sont
 * ceux du pricing : adhérent 22, 40 ou 70 € (grille du 04/10) ; sans
 * adhésion 5 € le soleil (10/11). Même prudence que pour l'adhésion : un
 * achat n'est tenu pour payé qu'après avoir relu le paiement chez HelloAsso.
 */
export const PACKS_SOLEILS = [
  { nombre: 5, adherent: 2200 },
  { nombre: 10, adherent: 4000 },
  { nombre: 20, adherent: 7000 },
] as const;
const PRIX_SOLEIL_SANS_ADHESION = 500;

export function prixPackCentimes(nombre: number, adherent: boolean): number | null {
  const pack = PACKS_SOLEILS.find((p) => p.nombre === nombre);
  if (!pack) return null;
  return adherent ? pack.adherent : nombre * PRIX_SOLEIL_SANS_ADHESION;
}

export async function verifierAchatSoleils(achatId: string): Promise<"payee" | "en_attente" | "introuvable"> {
  const admin = createAdminClient();
  if (!admin) throw new Error("clé de service manquante");

  const { data: a } = await admin
    .from("soleils_achats")
    .select("id, status, amount_cents, payment_provider, payment_reference")
    .eq("id", achatId)
    .maybeSingle();
  if (!a) return "introuvable";
  if (a.status === "payee") return "payee";
  if (a.status !== "en_attente_paiement" || a.payment_provider !== "helloasso" || !a.payment_reference) {
    return "en_attente";
  }

  const intention = await lireIntention(a.payment_reference);
  if (montantPaye(intention) < (a.amount_cents ?? Infinity)) return "en_attente";

  // Seul un achat encore en attente passe payé : une seconde vérification
  // simultanée ne fait rien.
  await admin
    .from("soleils_achats")
    .update({ status: "payee", paid_at: new Date().toISOString() })
    .eq("id", a.id)
    .eq("status", "en_attente_paiement");
  return "payee";
}

/** Revérifie les achats de soleils en attente des deux derniers jours. */
export async function rattraperAchatsSoleils() {
  const admin = createAdminClient();
  if (!admin) throw new Error("clé de service manquante");
  const depuis = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const { data: enAttente } = await admin
    .from("soleils_achats")
    .select("id")
    .eq("status", "en_attente_paiement")
    .not("payment_reference", "is", null)
    .gte("created_at", depuis);

  let payes = 0;
  for (const a of enAttente ?? []) {
    try {
      if ((await verifierAchatSoleils(a.id)) === "payee") payes++;
    } catch (e) {
      console.error("rattrapage soleils", a.id, e);
    }
  }
  return { verifies: enAttente?.length ?? 0, payes };
}
