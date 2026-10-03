"use client";

import { useState, type ReactNode } from "react";
import styles from "./ChoixCredits.module.css";

/**
 * Le choix de l'adhésion à 5 € par mois ou 50 € par an : le DÉPÔT (rouge,
 * par défaut) ou l'ACCÈS (blanc). Un seul interrupteur — celui de WFG 1,
 * piste et rond blanc — avec le mot écrit dans la piste. Les deux
 * lignes du côté choisi sont affichées, celles de l'autre côté disparaissent
 * (03/10, mots de Sarah). Sur les adhésions à 50 € et à 500 € (les lignes sont données par la page) ; celle à 5 € est
 * verrouillée sur ACCÈS.
 *
 * Le choix n'est pas encore enregistré : la page présente l'offre.
 *
 * Règle voulue par Sarah : les crédits de la semaine non utilisés sont
 * perdus. L'objectif est de faire revenir les talents régulièrement,
 * pas de leur laisser tout dépenser en une fois.
 */
export default function ChoixCredits({
  lignesDepot,
  lignesAcces,
  verrouille = false,
}: {
  lignesDepot: ReactNode;
  lignesAcces: ReactNode;
  /** Sur ACCÈS, sans pouvoir revenir au DÉPÔT (adhésion à 5 €). */
  verrouille?: boolean;
}) {
  const [acces, setAcces] = useState(verrouille);

  return (
    <>
      <li>
        <div className={styles.zone}>
          <button
            type="button"
            role="switch"
            aria-checked={acces}
            aria-label={acces ? "Accès" : "Dépôt"}
            className={`${styles.interrupteur} ${acces ? styles.cote : ""}`}
            disabled={verrouille}
            onClick={() => setAcces((v) => !v)}
          >
            <span className={styles.mot}>{acces ? "ACCÈS" : "DÉPÔT"}</span>
            <span className={styles.rond} />
          </button>
        </div>
      </li>
      {acces ? lignesAcces : lignesDepot}
    </>
  );
}
