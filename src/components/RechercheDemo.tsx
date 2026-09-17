"use client";

import { useState } from "react";
import styles from "./RechercheDemo.module.css";

/**
 * Démo statique : aucune recherche par mots-clés n'existe encore côté
 * données, donc seule la lettre "a" déclenche une liste figée, pour
 * montrer à quoi ressemblerait le résultat.
 */
const SUGGESTIONS_A = [
  "Action",
  "Aventure",
  "Animation",
  "Adaptation",
  "Anticipation",
  "Animation 2D-3D",
  "Anecdotes",
  "Adulte (passage à l'âge…)",
  "Animaux tueurs",
  "Actualités",
  "Absurde",
];

export default function RechercheDemo() {
  const [valeur, setValeur] = useState("");
  const montrer = valeur.trim().toLowerCase() === "a";

  return (
    <div className={styles.zone}>
      <div className={styles.champ}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          placeholder="Trouvez des projets, des talents, des personnages"
          className={styles.champInput}
        />
      </div>

      {montrer && (
        <ul className={styles.suggestions}>
          {SUGGESTIONS_A.map((mot) => (
            <li key={mot}>{mot}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
