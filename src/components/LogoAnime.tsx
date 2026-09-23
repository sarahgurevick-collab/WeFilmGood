"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { DUREE_ENGAGEMENT, ENGAGEMENTS } from "@/lib/engagements";
import styles from "./LogoAnime.module.css";

/**
 * Le logo complet — disque et « WE FILM GOOD » — qui passe d'un
 * engagement à l'autre.
 *
 * Le dessin n'est pas redessiné : c'est le fichier original de la marque,
 * utilisé comme pochoir (`mask`). Le navigateur peint la couleur à
 * travers la forme exacte du logo, texte compris. Rien n'est approximé,
 * et la couleur reste libre — ce qu'une image ordinaire, rouge une fois
 * pour toutes, n'aurait pas permis.
 *
 * Le rouge est la couleur d'origine : il ne porte aucune mention.
 */
const RATIO = 1381 / 1113;

export default function LogoAnime({
  hauteur = 34,
  tailleMention,
  centre = false,
  duree = DUREE_ENGAGEMENT,
}: {
  hauteur?: number;
  /** Taille du texte de l'engagement, en pixels (12 par défaut). */
  tailleMention?: number;
  /** true pour garder le dessin au milieu : la place de la mention est
      aussi réservée à gauche. */
  centre?: boolean;
  /** Temps passé sur chaque couleur, en millisecondes. */
  duree?: number;
}) {
  const [i, setI] = useState(0);
  const [anime, setAnime] = useState(false);

  // Rien ne bouge pour qui a demandé à son appareil de limiter les
  // animations : le logo reste simplement rouge.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setAnime(true);
    const t = setInterval(() => setI((n) => (n + 1) % ENGAGEMENTS.length), duree);
    return () => clearInterval(t);
  }, [duree]);

  const etat = anime ? ENGAGEMENTS[i] : ENGAGEMENTS[0];

  return (
    <span
      className={styles.bloc}
      style={
        {
          color: etat.couleur,
          ...(tailleMention ? { "--taille-mention": `${tailleMention}px` } : {}),
        } as CSSProperties
      }
    >
      {centre && (
        <span className={styles.zoneMention} aria-hidden="true">
          <span className={styles.gabarit}>for Humanity</span>
        </span>
      )}
      <span
        className={styles.dessin}
        role="img"
        aria-label="WeFilmGood"
        style={{ width: Math.round(hauteur * RATIO), height: hauteur }}
      />
      {/* La place du plus long engagement est réservée en permanence :
          sans cela, les onglets se décalaient toutes les 3,6 secondes. */}
      <span className={styles.zoneMention}>
        <span className={styles.gabarit} aria-hidden="true">
          for Humanity
        </span>
        {etat.mention && (
          <span key={etat.mention} className={styles.mention}>
            {etat.mention}
          </span>
        )}
      </span>
    </span>
  );
}
