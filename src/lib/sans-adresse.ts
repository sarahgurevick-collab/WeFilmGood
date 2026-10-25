/**
 * Les profils créés par l'administration sans adresse email (auteurs
 * sélectionnés avant WFG 1, 25/10/2026) ont quand même un compte de
 * connexion, pour que Sarah puisse « prendre la place » et remplir leur
 * profil. Ce compte porte une adresse fictive, sur un domaine qui n'existe
 * pas : aucun email n'y part jamais, et l'écran des membres l'affiche vide.
 */
export const DOMAINE_SANS_ADRESSE = "sans-adresse.invalid";

export function adresseFictive(id: string) {
  return `${id}@${DOMAINE_SANS_ADRESSE}`;
}

export function estAdresseFictive(email: string | null | undefined) {
  return !!email && email.toLowerCase().endsWith(`@${DOMAINE_SANS_ADRESSE}`);
}
