/**
 * Les métiers proposés en bloc 2 (« Votre parcours ») dépendent de la
 * catégorie choisie en bloc 1 : un auteur voit les quatre métiers
 * d'écriture, un producteur ou un autre talent voit les métiers du
 * plateau et de la fabrication.
 */

export const METIERS_AUTEUR = ["scenariste", "romancier", "auteur_theatre", "auteur_bd"];

export const METIERS_AUTRES = [
  // Un producteur ou un autre talent peut aussi écrire (Sarah, 10/10/2026).
  "scenariste",
  "producteur",
  "realisateur",
  "compositeur",
  "comedien",
  "sound_designer",
  "monteur",
  "directeur_photo",
  "chef_decorateur",
  "sfx_digitaux",
  "animateur_2d_3d",
];

export function metiersPourCategorie(category: string | null | undefined): string[] {
  if (category === "auteur") return METIERS_AUTEUR;
  if (category === "producteur" || category === "talent") return METIERS_AUTRES;
  return [];
}

/**
 * La question « Avez-vous un agent ? » ne concerne que les auteurs, les
 * comédiens, les réalisateurs et les compositeurs (Sarah, 10/10/2026) :
 * les quatre métiers qui ont un agent, et les plus importants. Pas un
 * producteur.
 */
const METIERS_AVEC_AGENT = new Set(["comedien", "realisateur", "compositeur"]);
export function questionAgentConcernee(
  category: string | null | undefined,
  roles: { role_slug: string }[] | null | undefined,
): boolean {
  return category === "auteur" || (roles ?? []).some((r) => METIERS_AVEC_AGENT.has(r.role_slug));
}
