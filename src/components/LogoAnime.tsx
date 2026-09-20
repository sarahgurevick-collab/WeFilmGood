"use client";

import { useEffect, useState } from "react";
import Logo, { ROUGE_WFG } from "./Logo";
import styles from "./LogoAnime.module.css";

/**
 * Le logo de la barre de menu, qui passe d'un engagement à l'autre.
 *
 * Le rouge est la couleur d'origine de la marque : il ne porte aucune
 * mention, c'est WeFilmGood tout court. Les trois autres couleurs
 * affichent l'engagement qu'elles désignent, à côté du disque.
 */
const ETATS = [
  { couleur: ROUGE_WFG, mention: null },
  { couleur: "#35B05E", mention: "for Planet" },
  { couleur: "#F2C230", mention: "for Humanity" },
  { couleur: "#3B8EF5", mention: "for Education" },
] as const;

const DUREE = 3600; // temps d'affichage de chaque couleur, en millisecondes

export default function LogoAnime({ size = 22 }: { size?: number }) {
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
      <Logo size={size} couleur="currentColor" />
      {etat.mention && (
        <span key={etat.mention} className={styles.mention}>
          {etat.mention}
        </span>
      )}
    </span>
  );
}
