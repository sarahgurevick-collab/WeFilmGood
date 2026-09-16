"use client";

import { useState } from "react";
import formStyles from "@/components/form.module.css";
import styles from "../lecteur.module.css";

/**
 * Trois zones : jusqu'à 80 rouge, jusqu'à 150 orange, au-delà vert. Le
 * franchissement du seuil ouvre la justification — labelliser un projet
 * demande de dire pourquoi.
 */
const SEUIL = 150;

function zoneDe(score: number) {
  if (score <= 80) return { cle: "rouge", libelle: "Ne correspond pas aux attentes" };
  if (score <= SEUIL) return { cle: "orange", libelle: "Intéressant, mais pas labellisé" };
  return { cle: "vert", libelle: "Labellisé" };
}

export default function ScoreSlider({ defaultValue = 100 }: { defaultValue?: number }) {
  const [score, setScore] = useState(defaultValue);
  const zone = zoneDe(score);
  const labellise = score > SEUIL;

  return (
    <>
      <div className={formStyles.field}>
        <span>Ma note</span>
        <div className={styles.note}>
          <strong className={styles[`note_${zone.cle}`]}>{score}</strong>
          <span className={styles.noteMax}>/ 200</span>
          <span className={`${styles.zone} ${styles[`zone_${zone.cle}`]}`}>
            <span className={`${styles.dot} ${styles[zone.cle]}`} aria-hidden="true" />
            {zone.libelle}
          </span>
        </div>
        <input
          id="score"
          type="range"
          name="score"
          min={0}
          max={200}
          step={1}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className={`${styles.slider} ${styles[`slider_${zone.cle}`]}`}
        />
      </div>

      {labellise && (
        <div className={formStyles.field}>
          <span>Pourquoi ce projet mérite le label</span>
          <textarea
            id="label_motivation"
            name="label_motivation"
            rows={3}
            required
            placeholder="Trois lignes suffisent : ce qui vous a plu, ce qui distingue ce texte."
          />
        </div>
      )}
    </>
  );
}
