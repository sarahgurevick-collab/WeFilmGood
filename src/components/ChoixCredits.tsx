"use client";

import { useState } from "react";
import styles from "./ChoixCredits.module.css";

/**
 * Le choix de l'adhésion à 50 € : chaque semaine, soit cinq crédits de
 * recherche, soit le dépôt d'un projet à la lecture. Deux boutons, un
 * « ou » entre les deux. Le choix n'est pas encore enregistré : la page
 * présente l'offre, le paiement viendra avec HelloAsso.
 *
 * Règle voulue par Sarah : les crédits de la semaine non utilisés sont
 * perdus. L'objectif est de faire revenir les talents régulièrement,
 * pas de leur laisser tout dépenser en une fois.
 */
export default function ChoixCredits() {
  const [choix, setChoix] = useState<"depot" | "recherche" | null>(null);

  return (
    <div className={styles.zone}>
      <div className={styles.paire}>
        <button
          type="button"
          className={`${styles.option} ${choix === "depot" ? styles.optionActive : ""}`}
          onClick={() => setChoix("depot")}
          aria-pressed={choix === "depot"}
        >
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>
          <strong>Le dépôt d&apos;un projet</strong>
          <span>
            L&apos;analyse d&apos;un projet de long métrage, court métrage, série ou VR/360,
            selon les modalités de dépôt.
          </span>
        </button>

        <span className={styles.ou} aria-hidden="true">
          ou
        </span>

        <button
          type="button"
          className={`${styles.option} ${choix === "recherche" ? styles.optionActive : ""}`}
          onClick={() => setChoix("recherche")}
          aria-pressed={choix === "recherche"}
        >
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <strong>5 crédits recherche par semaine</strong>
          <span>Cinq projets à ouvrir chaque semaine, à choisir dans la Pitchothèque.</span>
        </button>
      </div>

      <p className={styles.regle}>
        Les crédits d&apos;une semaine ne se gardent pas : ce qui n&apos;est pas utilisé
        est perdu. Chaque semaine en apporte de nouveaux.
      </p>
    </div>
  );
}
