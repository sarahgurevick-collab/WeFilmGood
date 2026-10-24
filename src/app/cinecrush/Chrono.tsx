"use client";

import { useEffect, useState } from "react";
import styles from "./cinecrush.module.css";

/**
 * « Le chrono est lancé ! » : le temps qui reste avant dimanche minuit
 * (heure de Paris), jours, heures, minutes, secondes.
 */
export default function Chrono({ finMs }: { finMs: number }) {
  const [reste, setReste] = useState<number | null>(null);

  useEffect(() => {
    const calculer = () => setReste(Math.max(0, finMs - Date.now()));
    calculer();
    const t = setInterval(calculer, 1000);
    return () => clearInterval(t);
  }, [finMs]);

  if (reste === null) return <div className={styles.chrono} aria-hidden="true" />;

  const s = Math.floor(reste / 1000);
  const jours = Math.floor(s / 86400);
  const heures = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secondes = s % 60;
  const deux = (n: number) => String(n).padStart(2, "0");

  return (
    <div className={styles.chrono} role="timer" aria-live="off">
      <span className={styles.chronoCase}>
        <strong>{jours}</strong>
        <small>jour{jours > 1 ? "s" : ""}</small>
      </span>
      <span className={styles.chronoCase}>
        <strong>{deux(heures)}</strong>
        <small>h</small>
      </span>
      <span className={styles.chronoCase}>
        <strong>{deux(minutes)}</strong>
        <small>min</small>
      </span>
      <span className={styles.chronoCase}>
        <strong>{deux(secondes)}</strong>
        <small>s</small>
      </span>
    </div>
  );
}
