"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./AnneeCompteur.module.css";

/**
 * Défile de 0 à `annees` à l'affichage, sauf préférence réduite pour le
 * mouvement où la valeur finale s'affiche directement.
 */
export default function AnneeCompteur({ annees }: { annees: number }) {
  const [valeur, setValeur] = useState(0);
  const depart = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValeur(annees);
      return;
    }

    const duree = 1200;
    let frame: number;

    const tick = (t: number) => {
      if (depart.current === null) depart.current = t;
      const progres = Math.min((t - depart.current) / duree, 1);
      setValeur(Math.round(progres * annees));
      if (progres < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [annees]);

  return (
    <div className={styles.compteur}>
      <span className={styles.chiffre}>{valeur}</span>
      <span className={styles.label}>ans</span>
    </div>
  );
}
