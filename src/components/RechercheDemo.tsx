"use client";

import { useState } from "react";
import Compteur from "./Compteur";
import styles from "./RechercheDemo.module.css";

/**
 * Démo statique : aucune recherche par mots-clés n'existe encore côté
 * données. La lettre "a" déclenche une liste figée, et choisir un mot
 * dans cette liste affiche des résultats figés eux aussi.
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
  const [selection, setSelection] = useState<string | null>(null);
  const montrer = valeur.trim().toLowerCase() === "a";

  const choisir = (mot: string) => {
    setValeur(mot);
    setSelection(mot);
  };

  return (
    <div className={styles.zone}>
      <div className={styles.ligne}>
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
            onChange={(e) => {
              setValeur(e.target.value);
              setSelection(null);
            }}
            placeholder="Trouvez des projets, des talents, des personnages"
            className={styles.champInput}
          />
        </div>

        {selection && (
          <div className={styles.resultats}>
            <Compteur valeur={133} label="Projets" />
            <Compteur valeur={196} label="Talents" />
            <Compteur valeur={12} label="Personnages" />
          </div>
        )}
      </div>

      {montrer && (
        <ul className={styles.suggestions}>
          {SUGGESTIONS_A.map((mot) => (
            <li key={mot}>
              <button type="button" onClick={() => choisir(mot)}>
                {mot}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
