"use client";

import { useState, type ReactNode } from "react";
import styles from "./SelecteurAdhesion.module.css";

const PALIERS = ["0€", "50€", "500€", "?€"];

export default function SelecteurAdhesion({
  contenus,
}: {
  contenus: ReactNode[];
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
    </div>
  );
}
