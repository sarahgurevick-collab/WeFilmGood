"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Compteur.module.css";

/**
 * Défile de 0 à `valeur` à l'affichage, sauf préférence réduite pour le
 * mouvement où la valeur finale s'affiche directement.
 */
export default function Compteur({
  valeur,
  label,
  taille = "petit",
}: {
  valeur: number;
  label: string;
  taille?: "petit" | "grand";
}) {
  const [affiche, setAffiche] = useState(0);
  const depart = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAffiche(valeur);
      return;
    }

    const duree = 1200;
    let frame: number;

    const tick = (t: number) => {
      if (depart.current === null) depart.current = t;
      const progres = Math.min((t - depart.current) / duree, 1);
      setAffiche(Math.round(progres * valeur));
      if (progres < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [valeur]);

  return (
    <div className={`${styles.compteur} ${taille === "grand" ? styles.grand : ""}`}>
      <span className={styles.chiffre}>{affiche.toLocaleString("fr-FR")}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
