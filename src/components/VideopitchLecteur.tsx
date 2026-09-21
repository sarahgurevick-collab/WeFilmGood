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
        // L'interrupteur de WFG 1 : rouge, le texte d'un côté, le rond de
        // l'autre. Il affiche la langue en cours ; un clic passe à l'autre.
        <button
          type="button"
          role="switch"
          aria-checked={langue === "en"}
          aria-label="Videopitch en anglais"
          title={langue === "fr" ? "Voir la version anglaise" : "Voir la version française"}
          className={`${styles.interrupteur} ${langue === "en" ? styles.anglais : ""}`}
          onClick={() => setLangue(langue === "fr" ? "en" : "fr")}
        >
          <span className={styles.texte}>{langue === "fr" ? "FR" : "EN"}</span>
          <span className={styles.rond} aria-hidden="true" />
        </button>
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
