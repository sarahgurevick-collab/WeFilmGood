"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { PORTRAIT_Y_DEFAUT } from "@/lib/portrait";
import CadreGlissant from "./CadreGlissant";
import { poserPhoto } from "./actions";
import styles from "./portraits.module.css";

function BoutonPoser() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={styles.valider} disabled={pending}>
      {pending ? "Envoi…" : "Poser cette photo"}
    </button>
  );
}

/**
 * Choisir la photo sur son ordinateur : elle s'affiche aussitôt, on la fait
 * glisser pour choisir ce qu'on voit du visage, puis un seul bouton la pose
 * sur le personnage.
 */
export default function PoserPhoto({ characterId }: { characterId: string }) {
  const [apercu, setApercu] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (apercu) URL.revokeObjectURL(apercu);
    };
  }, [apercu]);

  return (
    <form action={poserPhoto} className={styles.poser}>
      <input type="hidden" name="character_id" value={characterId} />
      <label className={styles.choisir}>
        Choisir la photo
        <input
          type="file"
          name="photo"
          accept="image/jpeg,image/png,image/webp"
          required
          className={styles.fichier}
          onChange={(e) => {
            const f = e.target.files?.[0];
            setApercu(f ? URL.createObjectURL(f) : null);
          }}
        />
      </label>
      {apercu && (
        <>
          {/* Une nouvelle photo : un nouveau cadre, qui repart du défaut. */}
          <CadreGlissant key={apercu} src={apercu} x={50} y={PORTRAIT_Y_DEFAUT} />
          <BoutonPoser />
        </>
      )}
    </form>
  );
}
