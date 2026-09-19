"use client";

import { useState } from "react";
import type { AnneeSelection } from "@/data/selectionsCannes";
import styles from "./PanelFestivals.module.css";

export type FestivalOption = {
  id: string;
  label: string;
  selections: AnneeSelection[];
};

export default function PanelFestivals({
  festivals,
}: {
  festivals: FestivalOption[];
}) {
  const [actifId, setActifId] = useState(festivals[0]?.id);
  const festival = festivals.find((f) => f.id === actifId) ?? festivals[0];

  return (
    <div className={styles.panelAuteurs}>
      <div
        className={styles.selecteur}
        role="tablist"
        aria-label="Choisir un festival"
      >
        {festivals.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={f.id === festival.id}
            className={
              f.id === festival.id ? styles.optionActive : styles.option
            }
            onClick={() => setActifId(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {festival.selections.map((annee) => (
        <section key={annee.annee} className={styles.annee}>
          <h2 className={styles.anneeTitre}>
            {festival.label} {annee.annee}
          </h2>

          {annee.blocs.map((bloc, i) => (
            <div key={i} className={styles.bloc}>
              <h3 className={styles.blocTitre}>{bloc.titre}</h3>
              <ul className={styles.liste}>
                {bloc.entrees.map((entree, j) => (
                  <li key={j}>{entree}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
