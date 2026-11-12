"use client";

import { Fragment, useState, useTransition, type ReactNode } from "react";
import { autresProjets } from "./actions";
import type { Filtres } from "./filtres";
import projetsStyles from "./projets.module.css";
import styles from "./duo.module.css";

/**
 * Les cartes des Galaxies et, dessous, le bouton « Voir d'autres projets »
 * (12/11/2026, libellé validé par Sarah) qui remplace les numéros de page :
 * chaque clic fait venir un lot de plus, sans recharger la page.
 */
export default function Suite({
  premier,
  page,
  pages,
  filtres,
}: {
  premier: ReactNode;
  /** Le numéro du premier lot (1, sauf arrivée par un ancien lien ?page=…). */
  page: number;
  pages: number;
  filtres: Filtres;
}) {
  const [lots, setLots] = useState<ReactNode[]>([]);
  const [enAttente, demarrer] = useTransition();
  const suivante = page + lots.length + 1;

  return (
    <>
      <ul className={styles.duo}>
        {premier}
        {lots.map((lot, i) => (
          <Fragment key={i}>{lot}</Fragment>
        ))}
      </ul>
      {suivante <= pages && (
        <p className={styles.suite}>
          <button
            type="button"
            className={`${projetsStyles.avanceeBouton} ${styles.suiteBouton}`}
            disabled={enAttente}
            onClick={() =>
              demarrer(async () => {
                const lot = await autresProjets(suivante, filtres);
                setLots((avant) => [...avant, lot]);
              })
            }
          >
            Voir d&apos;autres projets
          </button>
        </p>
      )}
    </>
  );
}
