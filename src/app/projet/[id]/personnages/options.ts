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

// La fiche en parties (07/10) : tout est facultatif. L'âge par tranche de
// dix ans remplace « Adulte » ; l'ancienne colonne age_range suit (voir
// AGE_ANCIEN) pour que le reste du site continue de fonctionner.
export const AGES_TRANCHES = [
  { value: "enfant", label: "Enfant" },
  { value: "ado", label: "Ado" },
  { value: "20", label: "20 ans" },
  { value: "30", label: "30 ans" },
  { value: "40", label: "40 ans" },
  { value: "50", label: "50 ans" },
  { value: "60", label: "60 ans" },
  { value: "70", label: "70 ans et plus" },
];

export const AGE_ANCIEN: Record<string, string> = {
  enfant: "enfant",
  ado: "adolescent",
  "20": "adulte",
  "30": "adulte",
  "40": "adulte",
  "50": "adulte",
  "60": "senior",
  "70": "senior",
};

export const EPOQUES = [
  { value: "aujourdhui", label: "Aujourd’hui" },
  { value: "80-90", label: "Années 80-90" },
  { value: "50-70", label: "Années 50-70" },
  { value: "debut-xxe", label: "Début du XXe siècle" },
  { value: "xixe", label: "XIXe siècle" },
  { value: "ancien", label: "Plus ancien" },
  { value: "futur", label: "Futur" },
];

export const TAILLES = [
  { value: "petite", label: "Petite" },
  { value: "moyenne", label: "Moyenne" },
  { value: "grande", label: "Grande" },
];

export const CORPULENCES = [
  { value: "mince", label: "Mince" },
  { value: "moyenne", label: "Moyenne" },
  { value: "forte", label: "Forte" },
  { value: "athletique", label: "Athlétique" },
];

export const CHEVEUX_COULEURS = [
  { value: "bruns", label: "Bruns" },
  { value: "chatains", label: "Châtains" },
  { value: "blonds", label: "Blonds" },
  { value: "roux", label: "Roux" },
  { value: "noirs", label: "Noirs" },
  { value: "gris", label: "Gris" },
  { value: "blancs", label: "Blancs" },
];

export const CHEVEUX_COUPES = [
  { value: "courts", label: "Courts" },
  { value: "mi-longs", label: "Mi-longs" },
  { value: "longs", label: "Longs" },
  { value: "boucles", label: "Bouclés" },
  { value: "crepus", label: "Crépus" },
  { value: "chauve", label: "Chauve" },
];

export const YEUX = [
  { value: "bleus", label: "Bleus" },
  { value: "verts", label: "Verts" },
  { value: "marron", label: "Marron" },
  { value: "noirs", label: "Noirs" },
  { value: "gris", label: "Gris" },
];

export const SIGNES = [
  { value: "lunettes", label: "Lunettes" },
  { value: "barbe", label: "Barbe" },
  { value: "moustache", label: "Moustache" },
  { value: "tatouage", label: "Tatouage" },
  { value: "cicatrice", label: "Cicatrice" },
  { value: "taches-de-rousseur", label: "Taches de rousseur" },
];

// Facultatif, et délicat : à relire par Sarah.
export const ORIGINES = [
  { value: "europeenne", label: "Européenne" },
  { value: "maghrebine", label: "Maghrébine" },
  { value: "africaine", label: "Africaine" },
  { value: "asiatique", label: "Asiatique" },
  { value: "indienne", label: "Indienne" },
  { value: "moyen-orientale", label: "Moyen-orientale" },
  { value: "latino", label: "Latino" },
  { value: "metisse", label: "Métisse" },
];
