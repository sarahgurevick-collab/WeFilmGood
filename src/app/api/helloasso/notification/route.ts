import { rattraperAdhesions } from "@/lib/adhesion-paiement";
import { rattraperDemandesLecture } from "@/lib/lecture-paiement";

/**
 * L'adresse que HelloAsso appelle après chaque paiement (à renseigner
 * dans son espace : Mon compte › Intégrations et API).
 *
 * On ne lit pas le contenu de la notification : n'importe qui peut
 * appeler cette adresse. Elle sert seulement de signal — on revérifie
 * aussitôt, chez HelloAsso, les adhésions et les lectures en attente.
 */
export async function POST() {
  try {
    await rattraperAdhesions();
  } catch (e) {
    console.error("notification HelloAsso", e);
  }
  try {
    await rattraperDemandesLecture();
  } catch (e) {
    console.error("notification HelloAsso (lecture)", e);
  }
  return Response.json({ ok: true });
}
