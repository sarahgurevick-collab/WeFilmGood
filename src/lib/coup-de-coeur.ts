/**
 * Le coup de cœur (22/11/2026, Sarah) : une note qui dépasse 180 sur 200.
 * Pas de case à cocher : la note seule le déclenche, comme le label
 * au-delà de 150. Il se montre par un cœur rouge à côté de la note.
 */
export const SEUIL_COUP_DE_COEUR = 180;

export const estCoupDeCoeur = (note: number | null | undefined): boolean =>
  typeof note === "number" && note > SEUIL_COUP_DE_COEUR;
