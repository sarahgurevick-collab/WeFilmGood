"use client";

import { useEffect, useState } from "react";
import { ROUGE_WFG } from "./Logo";
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
const ETATS = [
  { couleur: ROUGE_WFG, mention: null },
  { couleur: "#35B05E", mention: "for Planet" },
  { couleur: "#F2C230", mention: "for Humanity" },
  { couleur: "#3B8EF5", mention: "for Education" },
] as const;

const RATIO = 1381 / 1113;
const DUREE = 3600; // temps d'affichage de chaque couleur, en millisecondes

export default function LogoAnime({ hauteur = 34 }: { hauteur?: number }) {
  const [i, setI] = useState(0);
  const [anime, setAnime] = useState(false);

  // Rien ne bouge pour qui a demandé à son appareil de limiter les
  // animations : le logo reste simplement rouge.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setAnime(true);
    const t = setInterval(() => setI((n) => (n + 1) % ETATS.length), DUREE);
    return () => clearInterval(t);
  }, []);

  const etat = anime ? ETATS[i] : ETATS[0];

  return (
    <span className={styles.bloc} style={{ color: etat.couleur }}>
      <span
        className={styles.dessin}
        role="img"
        aria-label="WeFilmGood"
        style={{ width: Math.round(hauteur * RATIO), height: hauteur }}
      />
      {etat.mention && (
        <span key={etat.mention} className={styles.mention}>
          {etat.mention}
        </span>
      )}
    </span>
  );
}
