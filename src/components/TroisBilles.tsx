"use client";

import { useState } from "react";
import styles from "./TroisBilles.module.css";

// Les quatre couleurs des engagements (globals.css).
const ROUGE = "#da2c25";
const AUTRES = ["#f2c230", "#35b05e", "#3b8ef5"]; // jaune, vert, bleu

/** Deux couleurs différentes parmi le jaune, le vert et le bleu, au hasard. */
function tirer(): [string, string] {
  const ecartee = Math.floor(Math.random() * AUTRES.length);
  const [a, b] = AUTRES.filter((_, i) => i !== ecartee);
  return Math.random() < 0.5 ? [a, b] : [b, a];
}

/**
 * Trois billes animées, pour dire qu'une recherche est en cours. Le rouge
 * est toujours là ; les deux autres billes sont tirées au hasard parmi le
 * jaune, le vert et le bleu, à l'apparition puis à chaque tour.
 */
export default function TroisBilles({ libelle }: { libelle: string }) {
  const [[gauche, droite], setCouleurs] = useState(tirer);

  return (
    <div
      className={styles.billes}
      role="status"
      // En ligne, pour que le filtre soit cherché dans la page et non dans la feuille de style.
      style={{ filter: "url(#billes-fondues)" }}
      onAnimationIteration={(e) => {
        // Les billes ont leurs propres animations : seul le tour complet compte.
        if (e.target === e.currentTarget) setCouleurs(tirer());
      }}
    >
      <span className={`${styles.bille} ${styles.droite}`} style={{ backgroundColor: droite }} />
      <span className={`${styles.bille} ${styles.gauche}`} style={{ backgroundColor: gauche }} />
      <span className={`${styles.bille} ${styles.haut}`} style={{ backgroundColor: ROUGE }} />
      <span className={styles.lu}>{libelle}</span>
      <svg className={styles.filtre} aria-hidden="true">
        <defs>
          <filter id="billes-fondues">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="flou" />
            <feColorMatrix in="flou" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 21 -7" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
