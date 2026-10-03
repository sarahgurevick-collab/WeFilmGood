"use client";

import { useState, type ReactNode } from "react";
import styles from "./ChoixUnSeul.module.css";

/**
 * Des lignes d'avantages dont on coche une seule, au choix (pastille).
 * Le choix n'est pas encore enregistré : la page présente l'offre.
 */
export default function ChoixUnSeul({ lignes }: { lignes: ReactNode[] }) {
  const [choix, setChoix] = useState(0);

  return (
    <>
      {lignes.map((ligne, i) => (
        <li key={i}>
          <label className={styles.ligne}>
            <input
              type="radio"
              name="choix-depot-500"
              className={styles.pastille}
              checked={choix === i}
              onChange={() => setChoix(i)}
            />
            <span className={choix === i ? styles.actif : undefined}>{ligne}</span>
          </label>
        </li>
      ))}
    </>
  );
}
