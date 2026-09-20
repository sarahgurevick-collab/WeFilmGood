/**
 * Les couleurs de la marque et les engagements qu'elles portent.
 *
 * Le rouge est la couleur d'origine : il ne porte aucune mention, c'est
 * WeFilmGood tout court. Les trois autres affichent leur engagement.
 *
 * Source unique, partagée par la barre de menu et l'en-tête de
 * l'accueil, qui affichaient jusqu'ici deux jeux de couleurs différents.
 */
export const ROUGE_WFG = "#DA2C25";

export const ENGAGEMENTS = [
  { couleur: ROUGE_WFG, mention: null },
  { couleur: "#35B05E", mention: "for Planet" },
  { couleur: "#F2C230", mention: "for Humanity" },
  { couleur: "#3B8EF5", mention: "for Education" },
] as const;

export const DUREE_ENGAGEMENT = 3600; // millisecondes par couleur
