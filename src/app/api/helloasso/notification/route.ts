import { rattraperAdhesions } from "@/lib/adhesion-paiement";

/**
 * L'adresse que HelloAsso appelle après chaque paiement (à renseigner
 * dans son espace : Mon compte › Intégrations et API).
 *
 * On ne lit pas le contenu de la notification : n'importe qui peut
 * appeler cette adresse. Elle sert seulement de signal — on revérifie
 * aussitôt, chez HelloAsso, les adhésions en attente.
 */
export async function POST() {
  try {
    await rattraperAdhesions();
  } catch (e) {
    console.error("notification HelloAsso", e);
  }
  return Response.json({ ok: true });
}
