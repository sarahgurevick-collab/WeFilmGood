"use client";

import { useState } from "react";
import styles from "./ChoixCredits.module.css";

/**
 * Le choix de l'adhésion à 50 € : chaque semaine, soit le dépôt d'un
 * projet à la lecture, soit cinq crédits de recherche. Un seul
 * interrupteur — celui de WFG 1, piste et rond blanc — où c'est le logo
 * dans la piste qui change : le nuage sur fond rouge d'un côté, la loupe
 * sur fond vert de l'autre. Le texte à côté dit ce que le choix donne.
 *
 * Le choix n'est pas encore enregistré : la page présente l'offre, le
 * paiement viendra avec HelloAsso.
 *
 * Règle voulue par Sarah : les crédits de la semaine non utilisés sont
 * perdus. L'objectif est de faire revenir les talents régulièrement,
 * pas de leur laisser tout dépenser en une fois.
 */
const NUAGE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);

const LOUPE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export default function ChoixCredits() {
  const [recherche, setRecherche] = useState(false);

  return (
    <div className={styles.zone}>
      <div className={styles.ligne}>
        <button
          type="button"
          role="switch"
          aria-checked={recherche}
          aria-label={recherche ? "Cinq crédits recherche par semaine" : "Le dépôt d'un projet"}
          className={`${styles.interrupteur} ${recherche ? styles.cote : ""}`}
          onClick={() => setRecherche((v) => !v)}
        >
          <span className={styles.logo}>{recherche ? LOUPE : NUAGE}</span>
          <span className={styles.rond} />
        </button>

        <div className={styles.texte}>
          {recherche ? (
            <>
              <strong>5 crédits recherche par semaine</strong>
              <span>Cinq projets à ouvrir chaque semaine, à choisir dans la Pitchothèque.</span>
            </>
          ) : (
            <>
              <strong>Le dépôt d&apos;un projet</strong>
              <span>
                L&apos;analyse d&apos;un projet de long métrage, court métrage, série ou VR/360,
                selon les modalités de dépôt.
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
