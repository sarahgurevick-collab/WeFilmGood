"use client";

import { useState } from "react";
import styles from "./VideopitchLecteur.module.css";

/**
 * Le videopitch d'un projet, lu depuis Vimeo en marque blanche, comme
 * les masterclass. Quand l'auteur en a tourné deux — en français et en
 * anglais — un bouton permet de passer de l'un à l'autre.
 */
export default function VideopitchLecteur({
  fr,
  en,
  titre,
}: {
  fr: string | null;
  en: string | null;
  titre: string;
}) {
  const [langue, setLangue] = useState<"fr" | "en">(fr ? "fr" : "en");
  const vimeoId = langue === "fr" ? fr : en;
  if (!vimeoId) return null;

  return (
    <div className={styles.lecteur}>
      {fr && en && (
        <div className={styles.langues} role="group" aria-label="Langue du videopitch">
          <button
            type="button"
            aria-pressed={langue === "fr"}
            onClick={() => setLangue("fr")}
          >
            Français
          </button>
          <button
            type="button"
            aria-pressed={langue === "en"}
            onClick={() => setLangue("en")}
          >
            English
          </button>
        </div>
      )}
      <div className={styles.ecran}>
        <iframe
          key={vimeoId}
          src={`https://player.vimeo.com/video/${vimeoId}`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={`Videopitch — ${titre}`}
        />
      </div>
    </div>
  );
}
