"use client";

import { useState, type ReactNode } from "react";
import styles from "../../blocs.module.css";

/**
 * Le « + » du bas de la page (07/10) : la fiche vide n'est plus affichée à la
 * fin de la liste, elle s'ouvre quand on clique. Sans aucun personnage, elle
 * est ouverte d'emblée.
 */
export default function AjouterPersonnage({ ouvertDemblee, children }: { ouvertDemblee: boolean; children: ReactNode }) {
  const [ouvert, setOuvert] = useState(ouvertDemblee);
  return (
    <>
      {!ouvertDemblee && (
        <button type="button" className={styles.boutonPlus} onClick={() => setOuvert((o) => !o)} aria-expanded={ouvert}>
          <span className={styles.plus} aria-hidden="true">
            {ouvert ? "×" : "+"}
          </span>
          Ajouter un personnage
        </button>
      )}
      {ouvert && children}
    </>
  );
}
