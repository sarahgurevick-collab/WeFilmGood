import styles from "./Bandeau.module.css";

/** Les bandeaux posés par l'administration sur un projet signé ou tourné, et notre sélection. */
export const BANDEAUX: Record<string, string> = {
  signe: "Signé",
  tourne: "Tourné",
  // Plus de « primé » dans le ruban (25/10, Sarah) : « Film primé » est passé
  // en « Tourné », « Script primé » retiré ; les prix d'ailleurs sont écrits
  // sous le titre, le ruban ne porte que nos sélections.
  // Posé automatiquement par la base sur tout projet qui a une sélection de
  // la Maison des Scénaristes / WeFilmGood (24/10, Sarah) ; les autres passent devant.
  selection_mds: "Sélectionné",
};

/**
 * Le bandeau rouge en travers du coin haut gauche de la vignette, comme
 * sur WFG 1. Le parent doit être en position relative, overflow caché.
 */
export default function Bandeau({ valeur, grand = false }: { valeur: string | null; grand?: boolean }) {
  if (!valeur || !BANDEAUX[valeur]) return null;
  return (
    <span className={`${styles.bandeau} ${grand ? styles.grand : ""} ${BANDEAUX[valeur].length > 13 ? styles.long : ""}`}>
      {BANDEAUX[valeur]}
    </span>
  );
}
