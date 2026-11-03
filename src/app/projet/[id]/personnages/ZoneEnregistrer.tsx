"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../../blocs.module.css";
import { contenu } from "./contenu";

/**
 * Sous le portrait : « Enregistré. » quand le cadre vient d'être enregistré,
 * jusqu'au moindre nouveau changement dans le cadre (16/10, Sarah). Le bouton
 * qui était là a laissé la place à « Tout enregistrer », en bas de l'écran (03/11).
 */
export default function ZoneEnregistrer({
  enregistre,
}: {
  /** Ce cadre vient d'être enregistré. */
  enregistre: boolean;
}) {
  const zone = useRef<HTMLDivElement>(null);
  const [modifie, setModifie] = useState(false);

  useEffect(() => {
    const form = zone.current?.closest("form");
    if (!enregistre || !form) return;

    let depart: string | null = null;
    const regarder = () => {
      if (depart === null) return;
      setModifie(contenu(form) !== depart);
    };
    // Après le clic ou la frappe, on laisse aux champs le temps de se mettre à
    // jour (portrait choisi ou déplacé : ce ne sont pas des champs de saisie).
    const bientot = () => setTimeout(regarder, 0);

    const image = requestAnimationFrame(() => {
      depart = contenu(form);
    });
    const evenements = ["input", "change", "click", "pointerup", "keyup"];
    evenements.forEach((e) => form.addEventListener(e, bientot));
    return () => {
      cancelAnimationFrame(image);
      evenements.forEach((e) => form.removeEventListener(e, bientot));
    };
  }, [enregistre]);

  return (
    <div ref={zone} className={styles.enregistrerSousPortrait}>
      {enregistre && !modifie && <span className={styles.dejaEnregistre}>Enregistré.</span>}
    </div>
  );
}
