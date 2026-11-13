"use client";

import { Fragment, useState, useTransition, type ReactNode } from "react";
import { autresPersonnages, autresProjets } from "./actions";
import type { Filtres } from "./filtres";
import type { FiltresPersonnages } from "./filtres-personnages";
import projetsStyles from "./projets.module.css";
import styles from "./duo.module.css";

/**
 * Les cartes des Galaxies et, dessous, le bouton « Voir d'autres projets »
 * ou « Voir d'autres personnages » (12/11/2026, libellés validés par Sarah)
 * qui remplace les numéros de page : chaque clic fait venir un lot de plus,
 * sans recharger la page.
 */
export default function Suite({
  premier,
  page,
  pages,
  filtres,
  filtresPersonnages,
  quoi = "projets",
}: {
  quoi?: "projets" | "personnages";
  premier: ReactNode;
  /** Le numéro du premier lot (1, sauf arrivée par un ancien lien ?page=…). */
  page: number;
  pages: number;
  /** Les filtres de la recherche avancée (projets seulement). */
  filtres?: Filtres;
  /** Les filtres de la recherche avancée des personnages. */
  filtresPersonnages?: FiltresPersonnages;
}) {
  const [lots, setLots] = useState<ReactNode[]>([]);
  const [enAttente, demarrer] = useTransition();
  const suivante = page + lots.length + 1;

  return (
    <>
      <ul className={quoi === "personnages" ? styles.table : styles.duo}>
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
                const lot =
                  quoi === "personnages" || !filtres
                    ? await autresPersonnages(suivante, filtresPersonnages)
                    : await autresProjets(suivante, filtres);
                setLots((avant) => [...avant, lot]);
              })
            }
          >
            {quoi === "personnages" ? "Voir d'autres personnages" : "Voir d'autres projets"}
          </button>
        </p>
      )}
    </>
  );
}
