"use client";

import { useEffect, useState } from "react";
import styles from "./duo.module.css";

/**
 * Le nombre de projets, à côté du bouton « Recherche avancée » (12/11/2026,
 * Sarah ; d'abord essayé en très gros, « beaucoup trop gros »). Sur la première page il défile de zéro
 * jusqu'à sa valeur ; ailleurs, ou si le mouvement est réduit, il est posé.
 */
export default function GrandNombre({
  valeur,
  legende,
  anime,
}: {
  valeur: number;
  legende: string;
  anime: boolean;
}) {
  const [compte, setCompte] = useState<number | null>(null);
  const affiche = anime ? (compte ?? 0) : valeur;

  useEffect(() => {
    if (!anime) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duree = 1600;
    let depart: number | null = null;
    let image: number;
    const pas = (t: number) => {
      if (depart === null) depart = t;
      const progres = reduit ? 1 : Math.min((t - depart) / duree, 1);
      // Vite au début, de plus en plus lentement à l'arrivée.
      setCompte(Math.round((1 - Math.pow(1 - progres, 4)) * valeur));
      if (progres < 1) image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, [valeur, anime]);

  return (
    <p className={styles.nombre} aria-label={`${valeur.toLocaleString("fr-FR")} ${legende}`}>
      <span className={styles.nombreChiffre} aria-hidden="true">
        {affiche.toLocaleString("fr-FR")}
      </span>
      <span className={styles.nombreLegende} aria-hidden="true">
        {legende}
      </span>
    </p>
  );
}
