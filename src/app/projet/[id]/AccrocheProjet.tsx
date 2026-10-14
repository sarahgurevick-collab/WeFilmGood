"use client";

import { useState } from "react";
import styles from "./accroche.module.css";

/**
 * Sous le titre de la fiche (14/10/2026, Sarah) : la tagline, l'accroche
 * du projet, seule. La logline, le résumé, se lit sur demande : un lien
 * discret « Lire le résumé » la déplie sur place, avec les informations
 * supplémentaires s'il y en a ; « Replier » la referme. Avant le 14/10,
 * tout était dans un cadre sous le moodboard (03/10).
 */
export default function AccrocheProjet({
  tagline,
  logline,
  plus,
}: {
  tagline?: string | null;
  logline?: string | null;
  plus?: string | null;
}) {
  const [ouvert, setOuvert] = useState(false);
  const avecResume = Boolean(logline || plus);
  if (!tagline && !avecResume) return null;
  return (
    <div className={styles.zone}>
      {tagline && <p className={styles.tagline}>{tagline}</p>}
      {avecResume && (
        <>
          <button
            type="button"
            className={styles.lire}
            aria-expanded={ouvert}
            onClick={() => setOuvert((o) => !o)}
          >
            {ouvert ? "Replier" : "Lire le résumé"}
          </button>
          {ouvert && (
            <div className={styles.resume}>
              {logline && <p>{logline}</p>}
              {plus && <p>{plus}</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
