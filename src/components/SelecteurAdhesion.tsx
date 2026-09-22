"use client";

import { useState, type ReactNode } from "react";
import styles from "./SelecteurAdhesion.module.css";

const PALIERS = ["0 €", "5 €", "50 €", "500 €", "Sur devis"];

// Les paliers qui se paient en ligne, par HelloAsso (5, 50 et 500 €).
const PAYANTS = [1, 2, 3];

export default function SelecteurAdhesion({
  contenus,
  notePaiement,
}: {
  contenus: ReactNode[];
  /** Affichée sous les paliers payants : comment se passe le paiement. */
  notePaiement?: ReactNode;
}) {
  const [choix, setChoix] = useState(0);

  return (
    <div>
      <div className={styles.ligne}>
        {PALIERS.map((montant, i) => (
          <button
            key={i}
            type="button"
            className={styles.palier}
            onClick={() => setChoix(i)}
          >
            <span
              className={`${styles.point} ${choix === i ? styles.pointActif : ""}`}
            />
            <span className={styles.montant}>{montant}</span>
          </button>
        ))}
      </div>

      <div className={styles.contenu}>
        {contenus[choix] ?? "Contenu à venir."}
      </div>

      {notePaiement && PAYANTS.includes(choix) && (
        <div className={styles.note}>{notePaiement}</div>
      )}
    </div>
  );
}
