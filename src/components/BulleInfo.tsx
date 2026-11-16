"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./BulleInfo.module.css";

/**
 * Bulle d'information (16/11/2026, Sarah) : elle apparaît à l'arrivée sur
 * une page où quelque chose est limité — d'abord par un profil incomplet,
 * sur CinéMatch —, reste quelques secondes puis s'efface seule. La croix ×
 * la ferme avant. Elle ne remplace pas la phrase écrite dans la page : qui
 * a manqué la bulle la retrouve là.
 */
export default function BulleInfo({ children, duree = 8000 }: { children: ReactNode; duree?: number }) {
  const [etat, setEtat] = useState<"visible" | "part" | "fermee">("visible");

  useEffect(() => {
    const t = setTimeout(() => setEtat("part"), duree);
    return () => clearTimeout(t);
  }, [duree]);

  useEffect(() => {
    if (etat !== "part") return;
    const t = setTimeout(() => setEtat("fermee"), 400);
    return () => clearTimeout(t);
  }, [etat]);

  if (etat === "fermee") return null;

  return (
    <div className={`${styles.bulle} ${etat === "part" ? styles.part : ""}`} role="status">
      <div className={styles.texte}>{children}</div>
      <button type="button" className={styles.fermer} aria-label="Fermer" onClick={() => setEtat("fermee")}>
        ×
      </button>
    </div>
  );
}
