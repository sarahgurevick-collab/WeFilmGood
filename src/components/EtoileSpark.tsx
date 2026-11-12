"use client";

import { useState, type CSSProperties } from "react";
import styles from "./EtoileSpark.module.css";

/**
 * L'étoile des spectateurs : huit rayons, longs et courts en alternance,
 * avec le nombre d'étoiles reçues au centre.
 *
 * Essai demandé par Sarah le 12/11 d'après « Spark Spinner » de Pedro Lunet
 * (21st.dev), lui-même repris du « Spark » de loadsv. Le code d'origine
 * n'est pas accessible ; la forme est refaite ici. À la différence du
 * modèle, l'étoile ne tourne pas en continu (on croirait que la page
 * charge) : elle est immobile au repos, et ses rayons s'étirent en vague
 * quand on donne une étoile. `scintille` la fait vivre doucement, pour
 * signaler au talent des étoiles arrivées depuis sa dernière visite.
 *
 * Rien n'est enregistré : c'est une forme à regarder, pas encore une fonction.
 */
const RAYONS = 8;
const DEBUT = 27; // distance du centre où commence un rayon
const LONG = 41;
const COURT = 34;

function ecrire(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(Math.floor(n / 100) / 10).toString().replace(".", ",")} k`;
  return `${Math.floor(n / 1000)} k`;
}

export default function EtoileSpark({
  nombre,
  taille = 64,
  cliquable = false,
  scintille = false,
}: {
  nombre: number;
  taille?: number;
  /** Un clic ajoute une étoile (à l'écran seulement) et lance la vague. */
  cliquable?: boolean;
  scintille?: boolean;
}) {
  const [ajoutees, setAjoutees] = useState(0);
  const total = nombre + ajoutees;
  const texte = ecrire(total);
  const corps = texte.length <= 2 ? 22 : texte.length === 3 ? 17 : 13;

  const dessin = (
    <svg
      viewBox="-50 -50 100 100"
      width={taille}
      height={taille}
      className={scintille ? styles.scintille : undefined}
      aria-hidden="true"
    >
      {/* La clé change à chaque étoile donnée : la vague repart de zéro. */}
      <g key={ajoutees} className={ajoutees > 0 ? styles.vague : undefined}>
        <g className={styles.tour}>
          {Array.from({ length: RAYONS }, (_, i) => (
            <g key={i} transform={`rotate(${i * (360 / RAYONS)})`}>
              <line
                className={styles.rayon}
                style={{ "--i": i } as CSSProperties}
                x1={0}
                y1={-DEBUT}
                x2={0}
                y2={-(i % 2 === 0 ? LONG : COURT)}
              />
            </g>
          ))}
        </g>
        <text className={styles.nombre} fontSize={corps} x={0} y={0} textAnchor="middle" dominantBaseline="central">
          {texte}
        </text>
      </g>
    </svg>
  );

  if (!cliquable) {
    return (
      <span className={styles.etoile} role="img" aria-label={`${total} étoiles`}>
        {dessin}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`${styles.etoile} ${styles.bouton}`}
      onClick={() => setAjoutees((a) => a + 1)}
      aria-label={`${total} étoiles`}
    >
      {dessin}
    </button>
  );
}
