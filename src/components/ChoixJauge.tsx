"use client";

import { useRef, useState } from "react";
import { COULEURS_SATISFACTION } from "@/lib/satisfaction";
import styles from "./JaugeSatisfaction.module.css";

const RAYON = 46;
const TOUR = 2 * Math.PI * RAYON;
const ECART = 7; // le vide entre deux quarts, au repos
const QUARTS = [
  "M60 60 L60 0 A60 60 0 0 1 120 60 Z",
  "M60 60 L120 60 A60 60 0 0 1 60 120 Z",
  "M60 60 L60 120 A60 60 0 0 1 0 60 Z",
  "M60 60 L0 60 A60 60 0 0 1 60 0 Z",
];

/**
 * L'auteur note sa fiche de lecture : il clique sur un quart du cercle, qui
 * se remplit jusque-là et prend la couleur de la position (Sarah, 21/11/2026).
 * Le champ envoyé s'appelle « stars », de 1 à 4.
 *
 * `envoiDirect` : le clic envoie le formulaire, sans bouton (le bandeau).
 * Sinon la note est choisie, puis envoyée avec le bouton du formulaire.
 */
export default function ChoixJauge({
  taille = 120,
  envoiDirect = false,
  surDisque = false,
}: {
  taille?: number;
  envoiDirect?: boolean;
  surDisque?: boolean;
}) {
  const [choix, setChoix] = useState<number | null>(null);
  const [survol, setSurvol] = useState<number | null>(null);
  const boutons = useRef<(HTMLButtonElement | null)[]>([]);
  const montre = envoiDirect && choix ? choix : (survol ?? choix);

  const choisir = (q: number) => {
    if (envoiDirect) {
      if (choix) return;
      setChoix(q);
      // Le temps de voir le cercle se remplir, puis la note part.
      window.setTimeout(() => boutons.current[q - 1]?.click(), 450);
    } else {
      setChoix(q);
    }
  };

  return (
    <span
      className={[styles.choix, surDisque && styles.surDisque, montre && styles.choisi].filter(Boolean).join(" ")}
      role={envoiDirect ? "group" : "radiogroup"}
      aria-label="Notez cette analyse"
    >
      <svg className={styles.jauge} viewBox="0 0 120 120" width={taille} height={taille} aria-hidden="true">
        <circle className={styles.piste} cx={60} cy={60} r={RAYON} />
        {COULEURS_SATISFACTION.map((couleur, i) => (
          <circle
            key={couleur}
            className={styles.repere}
            cx={60}
            cy={60}
            r={RAYON}
            stroke={couleur}
            strokeDasharray={`${TOUR / 4 - ECART} ${TOUR}`}
            strokeDashoffset={-ECART / 2}
            transform={`rotate(${-90 + i * 90} 60 60)`}
          />
        ))}
        <circle
          className={styles.arc}
          cx={60}
          cy={60}
          r={RAYON}
          transform="rotate(-90 60 60)"
          stroke={montre ? COULEURS_SATISFACTION[montre - 1] : "transparent"}
          strokeDasharray={`${montre ? (TOUR * montre) / 4 : 0} ${TOUR}`}
        />
        {montre && (
          <text className={styles.chiffre} x={60} y={60} textAnchor="middle" dominantBaseline="central">
            {montre}
          </text>
        )}
        {QUARTS.map((d, i) => (
          <path
            key={d}
            className={styles.quart}
            d={d}
            onClick={() => choisir(i + 1)}
            onMouseEnter={() => setSurvol(i + 1)}
            onMouseLeave={() => setSurvol(null)}
          />
        ))}
      </svg>
      {/* Les vrais champs, invisibles : pour le clavier, les lecteurs d'écran et l'envoi. */}
      <span className={styles.discrets}>
        {[1, 2, 4, 3].map((q) =>
          envoiDirect ? (
            <button
              key={q}
              ref={(b) => {
                boutons.current[q - 1] = b;
              }}
              type="submit"
              name="stars"
              value={q}
              aria-label={`${q} sur 4`}
            />
          ) : (
            <input
              key={q}
              type="radio"
              name="stars"
              value={q}
              required
              checked={choix === q}
              onChange={() => setChoix(q)}
              aria-label={`${q} sur 4`}
            />
          ),
        )}
      </span>
    </span>
  );
}
