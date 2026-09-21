"use client";

import { useState, type ReactNode } from "react";
import styles from "./cadre.module.css";

/**
 * Les onglets posés sur la bordure du cadre. Le videopitch s'affiche
 * d'abord ; « Mon équipe » le remplace : soit il a déjà été vu, soit le
 * producteur s'intéresse plutôt aux talents.
 */
export default function OngletsCadre({
  onglets,
}: {
  onglets: { cle: string; titre: string; contenu: ReactNode }[];
}) {
  const [actif, setActif] = useState(onglets[0]?.cle);
  const courant = onglets.find((o) => o.cle === actif) ?? onglets[0];

  return (
    <>
      <div className={styles.onglets} role="tablist">
        {onglets.map((o) => (
          <button
            key={o.cle}
            type="button"
            role="tab"
            aria-selected={o.cle === courant.cle}
            className={`${styles.onglet} ${o.cle === courant.cle ? styles.ongletActif : ""}`}
            onClick={() => setActif(o.cle)}
          >
            {o.titre}
          </button>
        ))}
      </div>
      <div role="tabpanel">{courant.contenu}</div>
    </>
  );
}
