"use client";

import { useRef, useState } from "react";
import type { AnneeSelection } from "@/data/selectionsCannes";
import GrilleInclineeCannes from "./GrilleInclineeCannes";
import styles from "./SectionFestivals.module.css";

export type FestivalOption = {
  id: string;
  label: string;
  selections: AnneeSelection[];
};

export default function SectionFestivals({
  festivals,
}: {
  festivals: FestivalOption[];
}) {
  const [actifId, setActifId] = useState(festivals[0]?.id);
  const festival = festivals.find((f) => f.id === actifId) ?? festivals[0];
  const pisteRef = useRef<HTMLDivElement>(null);

  const defiler = (sens: 1 | -1) => {
    const piste = pisteRef.current;
    if (!piste) return;
    piste.scrollBy({ left: sens * piste.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <>
      <div className={styles.selecteurLigne}>
        <button
          type="button"
          className={styles.fleche}
          aria-label="Festivals précédents"
          onClick={() => defiler(-1)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div
          className={styles.selecteur}
          role="tablist"
          aria-label="Choisir un festival"
          ref={pisteRef}
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

        <button
          type="button"
          className={styles.fleche}
          aria-label="Festivals suivants"
          onClick={() => defiler(1)}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <p className={styles.intro}>
        Les festivals et résidences partenaires, année après année : les
        projets sélectionnés par la Maison des Scénaristes et WeFilmGood pour
        pitcher devant les professionnels du secteur.
      </p>

      <div className={styles.layout}>
        <GrilleInclineeCannes />

        <div className={styles.panelAuteurs}>
          {festival.selections.length === 0 ? (
            <p className={styles.aVenir}>
              Sélection à venir pour {festival.label}.
            </p>
          ) : (
            festival.selections.map((annee, i) => (
              <section key={annee.annee ?? i} className={styles.annee}>
                <h2 className={styles.anneeTitre}>
                  {festival.label}
                  {annee.annee ? ` ${annee.annee}` : ""}
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
            ))
          )}
        </div>
      </div>
    </>
  );
}
