// La satisfaction des auteurs sur une fiche de lecture, de 1 (déçu) à 5 (ravi) :
// des emojis à la place des étoiles depuis le 04/11/2026 (Sarah), partout.
export const EMOJIS_SATISFACTION = ["😡", "😕", "😐", "😊", "😍"] as const;

/** L'emoji d'une note de 1 à 5, ou un tiret s'il n'y en a pas. */
export function emojiSatisfaction(note: number | null | undefined): string {
  return note && note >= 1 && note <= 5 ? EMOJIS_SATISFACTION[note - 1] : "—";
}
