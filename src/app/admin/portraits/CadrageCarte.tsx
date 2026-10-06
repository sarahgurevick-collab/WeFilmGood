"use client";

import { useActionState } from "react";
import CadreGlissant from "./CadreGlissant";
import { cadrerPortrait } from "./actions";
import styles from "./portraits.module.css";

/**
 * Le portrait d'une carte (Moyens, Bons) : on le fait glisser, puis
 * « Enregistrer le cadrage ». Le bouton dit « Enregistrement… » pendant
 * l'envoi, puis laisse place à « Cadrage enregistré » (06/10, demande de Sarah).
 */
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
  const [sauve, action, enCours] = useActionState(async (_precedent: string | null, formData: FormData) => {
    await cadrerPortrait(formData);
    return `${formData.get("photo_x")},${formData.get("photo_y")}`;
  }, null);

  return (
    <form action={action} className={styles.formCadre}>
      <input type="hidden" name="character_id" value={characterId} />
      <CadreGlissant
        src={src}
        x={x}
        y={y}
        sauve={sauve}
        enfants={
          <button type="submit" className={styles.valider} disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer le cadrage"}
          </button>
        }
      />
    </form>
  );
}
