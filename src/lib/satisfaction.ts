// La satisfaction des auteurs sur une fiche de lecture : une jauge ronde à
// quatre positions, aux quatre couleurs du logo, de 1 (rouge, mécontent) à
// 4 (vert, ravi) — Sarah, 21/11/2026. Elle remplace les cinq emojis du 04/11,
// que les lecteurs n'aimaient pas.
export const COULEURS_SATISFACTION = ["#DA2C25", "#F2C230", "#3B8EF5", "#35B05E"] as const;

/** Une position de 1 à 4, ou rien. */
export function positionSatisfaction(note: number | null | undefined): number | null {
  return note && Number.isInteger(note) && note >= 1 && note <= 4 ? note : null;
}

/**
 * Les notes de WFG 1 étaient sur cinq étoiles ; elles restent telles quelles
 * dans la base, et l'affichage les range dans les quatre positions :
 * 1 et 2 étoiles → rouge, 3 → jaune, 4 → bleu, 5 → vert (Sarah, 21/11/2026).
 */
export function positionDepuisCinq(note: number | null | undefined): number | null {
  if (!note || note < 1 || note > 5) return null;
  return note <= 2 ? 1 : note - 1;
}
