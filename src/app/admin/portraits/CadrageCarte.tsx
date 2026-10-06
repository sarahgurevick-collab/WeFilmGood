"use client";

import CadreGlissant from "./CadreGlissant";
import { cadrerPortrait } from "./actions";
import styles from "./portraits.module.css";

/** Le portrait d'une carte (Moyens, Bons) : on le fait glisser, puis « Enregistrer le cadrage ». */
export default function CadrageCarte({
  characterId,
  src,
  x,
  y,
}: {
  characterId: string;
  src: string;
  x: number;
  y: number;
}) {
  return (
    <form action={cadrerPortrait} className={styles.formCadre}>
      <input type="hidden" name="character_id" value={characterId} />
      <CadreGlissant
        src={src}
        x={x}
        y={y}
        enfants={
          <button type="submit" className={styles.valider}>
            Enregistrer le cadrage
          </button>
        }
      />
    </form>
  );
}
