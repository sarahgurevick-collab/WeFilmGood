import { enregistrerUnPersonnage } from "./actions";
import { contenu } from "./contenu";

/**
 * Ce que contenait chaque cadre déjà enregistré à l'ouverture de la page
 * (rempli par ToutEnregistrer). Sert à n'envoyer que les cadres modifiés :
 * un personnage repris de WFG 1 peut avoir une valeur absente des listes,
 * qu'un enregistrement effacerait.
 */
export const depart = new Map<HTMLFormElement, string>();

export function noterDepart() {
  document.querySelectorAll<HTMLFormElement>("form[data-personnage]").forEach((f) => {
    if (f.querySelector('input[name="character_id"]')) depart.set(f, contenu(f));
  });
}

/**
 * Enregistre, un par un, chaque cadre modifié et chaque nouveau personnage
 * qui a un nom (un cadre ouvert puis laissé vide est ignoré). Renvoie le
 * message d'erreur, ou null si tout est passé.
 */
export async function enregistrerLesModifies(exclure?: HTMLFormElement): Promise<string | null> {
  const aEnvoyer = Array.from(document.querySelectorAll<HTMLFormElement>("form[data-personnage]")).filter((f) => {
    if (f === exclure) return false;
    const avant = depart.get(f);
    if (avant !== undefined) return contenu(f) !== avant;
    return !!f.querySelector<HTMLInputElement>('input[name="name"]')?.value.trim();
  });
  // Un nom effacé : le navigateur le signale sur le cadre concerné.
  for (const f of aEnvoyer) {
    if (!f.reportValidity()) return "Le nom du personnage est obligatoire.";
  }
  for (const f of aEnvoyer) {
    const { erreur } = await enregistrerUnPersonnage(new FormData(f));
    if (erreur) {
      f.scrollIntoView({ behavior: "smooth", block: "start" });
      const nom = f.querySelector<HTMLInputElement>('input[name="name"]')?.value.trim();
      return nom ? `${nom} : ${erreur}` : erreur;
    }
    // Déjà enregistré : s'il faut recommencer après une erreur, il ne repart pas.
    depart.set(f, contenu(f));
  }
  return null;
}
