"use client";

import { useState } from "react";
import Surligne from "@/components/Surligne";
import { contientUnMot } from "@/app/pitchotheque/mot-trouve";
import styles from "./accroche.module.css";

/**
 * Sous le titre de la fiche (14/10/2026, Sarah) : la tagline, l'accroche
 * du projet, seule. La logline, le résumé, se lit sur demande : un lien
 * discret « Lire le résumé » la déplie sur place, avec les informations
 * supplémentaires s'il y en a ; « Replier » la referme. Avant le 14/10,
 * tout était dans un cadre sous le moodboard (03/10).
 *
 * Venu d'une recherche des Galaxies (02/11, Sarah) : les mots cherchés
 * sont en rouge, et le résumé est déplié d'office s'ils s'y trouvent.
 */
export default function AccrocheProjet({
  tagline,
  logline,
  plus,
  mots = [],
}: {
  tagline?: string | null;
  logline?: string | null;
  plus?: string | null;
  /** Les mots cherchés dans les Galaxies, normalisés (minuscules, sans accent). */
  mots?: string[];
}) {
  const [ouvert, setOuvert] = useState(() => contientUnMot(logline, mots) || contientUnMot(plus, mots));
  const avecResume = Boolean(logline || plus);
  if (!tagline && !avecResume) return null;
  return (
    <div className={styles.zone}>
      {tagline && <p className={styles.tagline}><Surligne texte={tagline} mots={mots} /></p>}
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
              {logline && <p><Surligne texte={logline} mots={mots} /></p>}
              {plus && <p><Surligne texte={plus} mots={mots} /></p>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
