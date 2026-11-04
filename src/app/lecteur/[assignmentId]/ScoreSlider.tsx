"use client";

import { useState, type ReactNode } from "react";
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

/**
 * Une barre fine (04/11, Sarah, modèle « range slider inline » de 21st.dev) :
 * « Ma note » à gauche dans la barre, la note à droite, le remplissage à la
 * couleur de la zone. Le vrai curseur du navigateur est posé dessus, invisible,
 * pour la souris, le doigt et le clavier. Le bouton du formulaire se met à côté.
 */
export default function ScoreSlider({
  defaultValue = 100,
  bouton,
}: {
  defaultValue?: number;
  /** Le bouton du formulaire, posé à droite de la barre. */
  bouton?: ReactNode;
}) {
  const [score, setScore] = useState(defaultValue);
  const zone = zoneDe(score);
  const labellise = score > SEUIL;
  const pourcent = (score / 200) * 100;

  return (
    <>
      <div className={formStyles.field}>
        <div className={styles.noteLigne}>
          <div className={`${styles.noteBarre} ${styles[`noteBarre_${zone.cle}`]}`}>
            <span className={styles.noteRemplissage} style={{ width: `${pourcent}%` }} aria-hidden="true" />
            <span className={styles.notePoignee} style={{ left: `calc(${pourcent}% - 2px)` }} aria-hidden="true" />
            <span className={styles.noteEtiquette} aria-hidden="true">Ma note</span>
            <span className={styles.noteValeur} aria-hidden="true">
              {score} <span className={styles.noteMax}>/ 200</span>
            </span>
            <input
              id="score"
              type="range"
              name="score"
              min={0}
              max={200}
              step={1}
              value={score}
              aria-label="Ma note sur 200"
              onChange={(e) => setScore(Number(e.target.value))}
              className={styles.noteCurseur}
            />
          </div>
          {bouton}
        </div>
        <span className={`${styles.zone} ${styles[`zone_${zone.cle}`]}`}>
          <span className={`${styles.dot} ${styles[zone.cle]}`} aria-hidden="true" />
          {zone.libelle}
        </span>
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
