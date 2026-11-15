"use client";

import { useEffect, useState } from "react";
import { useEmplacementEntete } from "./useEmplacementEntete";
import styles from "./FlecheHaut.module.css";

/**
 * La flèche en bas à droite qui ramène en haut de la page (15/11, Sarah) :
 * Mira et le globe sont rangés dans la barre du haut, le coin est libre.
 * Elle n'apparaît qu'après avoir descendu un peu. Sur une page sans barre
 * (Mira reste alors en bas), elle se pose au-dessus de Mira.
 */
export default function FlecheHaut() {
  const [visible, setVisible] = useState(false);
  const emplacement = useEmplacementEntete();

  useEffect(() => {
    const surDefilement = () => setVisible(window.scrollY > 400);
    surDefilement();
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => window.removeEventListener("scroll", surDefilement);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className={`${styles.fleche} ${emplacement ? "" : styles.auDessusDeMira}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Remonter en haut de la page"
      title="Remonter en haut de la page"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
