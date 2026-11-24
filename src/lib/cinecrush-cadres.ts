/**
 * Les cadres de la carte du CinéCrush dans les Galaxies (24/11/2026, Sarah),
 * choisis à la programmation (colonne cinecrush.cadre, migration 0330).
 * Un nouveau cadre = une ligne ici, sa valeur dans le contrôle de la
 * colonne, et son dessin dans galaxies/duo.module.css.
 */
export const CADRES = [
  { value: "cinema", label: "Cinéma" },
  { value: "tableau", label: "Tableau" },
  { value: "fleuri", label: "Fleuri" },
] as const;

export type Cadre = (typeof CADRES)[number]["value"];

export const cadreValide = (valeur: unknown): Cadre =>
  CADRES.some((c) => c.value === valeur) ? (valeur as Cadre) : "cinema";
