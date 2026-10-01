"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../../blocs.module.css";

/** Le nom du signal envoyé par ChercheurPortrait au formulaire du personnage. */
export const PORTRAIT_CHOISI = "portrait-choisi";

/**
 * La case « Portrait » d'un personnage. Un portrait cliqué dans les
 * propositions s'y affiche aussitôt (01/10) ; il n'est enregistré qu'avec
 * le bouton du cadre.
 */
export default function CasePortrait({ photo }: { photo: string | null }) {
  const cadre = useRef<HTMLDivElement>(null);
  const [choisi, setChoisi] = useState<string | null>(null);

  useEffect(() => {
    const formulaire = cadre.current?.closest("form");
    if (!formulaire) return;
    const suivre = (e: Event) => setChoisi((e as CustomEvent<string | null>).detail);
    formulaire.addEventListener(PORTRAIT_CHOISI, suivre);
    return () => formulaire.removeEventListener(PORTRAIT_CHOISI, suivre);
  }, []);

  const image = choisi ?? photo;
  return (
    <div ref={cadre} className={styles.portrait}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" />
      ) : (
        <span>Portrait</span>
      )}
    </div>
  );
}
