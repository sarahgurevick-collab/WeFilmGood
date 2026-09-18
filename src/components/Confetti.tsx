"use client";

import { useEffect, useState, type CSSProperties } from "react";
import styles from "./Confetti.module.css";

const COULEURS = ["#e2231a", "#1f8a3c", "#f0b400", "#1b63c9", "#ff8fab"];
const NB_PIECES = 40;

type Piece = {
  gauche: number;
  couleur: string;
  delai: number;
  duree: number;
  derive: number;
  rotation: number;
  taille: number;
};

/** Confettis qui tombent en boucle autour d'un élément à célébrer (ex : le "10 ans" du hero). */
export default function Confetti() {
  const [pieces, setPieces] = useState<Piece[] | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setPieces(
      Array.from({ length: NB_PIECES }, () => ({
        gauche: Math.random() * 100,
        couleur: COULEURS[Math.floor(Math.random() * COULEURS.length)],
        delai: Math.random() * 1.2,
        duree: 1 + Math.random() * 0.8,
        derive: Math.random() * 60 - 30,
        rotation: Math.random() * 360,
        taille: 6 + Math.random() * 6,
      }))
    );
  }, []);

  if (!pieces) return null;

  return (
    <div className={styles.confetti} aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className={styles.piece}
          style={
            {
              left: `${p.gauche}%`,
              backgroundColor: p.couleur,
              width: p.taille,
              height: p.taille * 0.4,
              animationDelay: `${p.delai}s`,
              animationDuration: `${p.duree}s`,
              "--derive": `${p.derive}px`,
              "--rotation": `${p.rotation}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
