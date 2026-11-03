"use client";

import { Fragment, useState, type ReactNode } from "react";
import styles from "../../blocs.module.css";

/**
 * Le « + » du bas de la page (07/10) : la fiche vide n'est plus affichée à la
 * fin de la liste, elle s'ouvre quand on clique. Sans aucun personnage, elle
 * est ouverte d'emblée.
 *
 * Chaque clic ouvre une fiche vide de plus (03/11, Sarah : créer plusieurs
 * personnages, puis « Tout enregistrer » à la fin).
 */
export default function AjouterPersonnage({ ouvertDemblee, children }: { ouvertDemblee: boolean; children: ReactNode }) {
  const [nombre, setNombre] = useState(ouvertDemblee ? 1 : 0);
  return (
    <>
      {nombre > 0 && (
        <div className={styles.liste}>
          {Array.from({ length: nombre }, (_, i) => (
            <Fragment key={i}>{children}</Fragment>
          ))}
        </div>
      )}
      <button type="button" className={styles.boutonPlus} onClick={() => setNombre((n) => n + 1)}>
        <span className={styles.plus} aria-hidden="true">
          +
        </span>
        Ajouter un personnage
      </button>
    </>
  );
}
