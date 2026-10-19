/**
 * La lettre du métier, pour l'avatar sans photo : un rond rouge (19/10/2026,
 * Sarah). Une personne sans photo, ou pas encore inscrite, ne doit pas laisser
 * deviner un genre. P, R, S, C, M, D, Mo, Dé, So validées par Sarah ; les
 * autres (BD, Ro, Th, FX, An, Ag, Di, Tr) sont de moi, à valider.
 */
const LETTRES: Record<string, string> = {
  Producteur: "P",
  Réalisateur: "R",
  Scénariste: "S",
  Comédien: "C",
  Compositeur: "M",
  "Directeur photo": "D",
  Monteur: "Mo",
  "Chef décorateur": "Dé",
  "Sound designer": "So",
  "Auteur de BD": "BD",
  Romancier: "Ro",
  "Auteur de Théâtre": "Th",
  "Créateur SFX/IA": "FX",
  "Animateur 2D/3D": "An",
  Agent: "Ag",
  Diffuseur: "Di",
  "Talonneur truquiste": "Tr",
  Lecteur: "L",
};

export function lettreDuMetier(label: string | null | undefined): string {
  if (!label) return "";
  return LETTRES[label] ?? label.trim().charAt(0).toUpperCase();
}
