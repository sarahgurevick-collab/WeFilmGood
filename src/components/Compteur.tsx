"use client";

import { useEffect, useRef, useState } from "react";
import FeuArtifice from "./FeuArtifice";
import styles from "./Compteur.module.css";

/**
 * Défile de 0 à `valeur` à l'affichage, sauf préférence réduite pour le
 * mouvement où la valeur finale s'affiche directement. Avec `feuArtifice`,
 * l'arrivée est saluée par quelques gerbes.
 */
export default function Compteur({
  valeur,
  label,
  taille = "petit",
  feuArtifice = false,
}: {
  valeur: number;
  label: string;
  taille?: "petit" | "grand";
  feuArtifice?: boolean;
}) {
  const [affiche, setAffiche] = useState(0);
  const [arrive, setArrive] = useState(false);
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
      else setArrive(true);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [valeur]);

  return (
    <div className={`${styles.compteur} ${taille === "grand" ? styles.grand : ""}`}>
      {feuArtifice && arrive && <FeuArtifice />}
      <span
        className={`${styles.chiffre} ${feuArtifice && arrive ? styles.pop : ""}`}
      >{affiche.toLocaleString("fr-FR")}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
