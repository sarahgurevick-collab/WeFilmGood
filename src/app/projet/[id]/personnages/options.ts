/** Les listes du bloc 3, partagées entre le formulaire et l'enregistrement. */
export const TYPES = [
  { value: "principal", label: "Personnage principal" },
  { value: "secondaire", label: "Personnage secondaire" },
];

// « Genre » veut dire deux choses sur le site : ici, c'est celui du
// personnage, jamais celui du film.
export const GENRES_PERSONNAGE = [
  { value: "homme", label: "Un homme" },
  { value: "femme", label: "Une femme" },
  { value: "autre", label: "Autre" },
];

export const AGES = [
  { value: "enfant", label: "Enfant" },
  { value: "adolescent", label: "Adolescent" },
  { value: "adulte", label: "Adulte" },
  { value: "senior", label: "Senior" },
];
