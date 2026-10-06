"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
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
 * Choisir la photo sur son ordinateur : elle s'affiche aussitôt en petit,
 * puis un seul bouton la pose sur le personnage.
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={apercu} alt="" className={styles.apercu} />
          <BoutonPoser />
        </>
      )}
    </form>
  );
}
