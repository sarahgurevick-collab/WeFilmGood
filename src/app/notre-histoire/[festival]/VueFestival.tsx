"use client";

import Link from "next/link";
import { useState } from "react";
import RoueAnnees from "@/components/RoueAnnees";
import type { AnneeSelection } from "@/data/selectionsCannes";
import styles from "../notre-histoire.module.css";

const PROGRAMMES_EN_ROUGE = [
  "Writers-Producers Meetings",
  "Scenariolab",
  "Pitchs sans frontières",
  "Pitchs de la francophonie",
  "Un pitch pour un long",
];

/**
 * Un festival de « Notre histoire » (15/10/2026, Sarah) : en haut, la roue
 * des années à gauche et les projets sélectionnés à droite — les noms
 * changent quand la roue tourne. Les photos sont sur la page d'entrée.
 */
export default function VueFestival({
  nom,
  logo,
  annees,
  selections,
}: {
  nom: string;
  logo: string | null;
  annees: number[];
  selections: AnneeSelection[];
}) {
  const [annee, setAnnee] = useState<number>(annees[0] ?? 0);
  const choisie = selections.find((s) => s.annee === annee);
  // Les sélections sans année (SATIS…) s'affichent sous la liste.
  const sansAnnee = selections.filter((s) => s.annee === undefined);

  return (
    <>
      <Link href="/notre-histoire" className={styles.retour}>
        ← Tous les festivals
      </Link>

      {logo && (
        <div className={styles.entete}>
          <span className={styles.enteteLogo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} alt="" />
          </span>
        </div>
      )}

      {annees.length === 0 && sansAnnee.length === 0 ? (
        <p className={styles.aVenir}>Sélection à venir.</p>
      ) : (
        <div className={styles.deuxColonnes}>
          {annees.length > 0 ? <RoueAnnees annees={annees} valeur={annee} onChange={setAnnee} /> : <div />}
          <div className={styles.liste}>
            {choisie && (
              <>
                <h2 className={styles.anneeTitre}>{annee}</h2>
                {choisie.blocs.map((bloc, i) => (
                  <Bloc key={i} titre={bloc.titre} entrees={bloc.entrees} />
                ))}
              </>
            )}
            {sansAnnee.map((s, i) =>
              s.blocs.map((bloc, j) => <Bloc key={`${i}-${j}`} titre={bloc.titre} entrees={bloc.entrees} />),
            )}
          </div>
        </div>
      )}

      <span hidden>{nom}</span>
    </>
  );
}

function Bloc({ titre, entrees }: { titre: string; entrees: string[] }) {
  const rouge = PROGRAMMES_EN_ROUGE.some((p) => titre.includes(p));
  return (
    <div className={styles.bloc}>
      <h3 className={rouge ? styles.blocTitreRouge : styles.blocTitre}>{titre}</h3>
      <ul className={styles.entrees}>
        {entrees.map((e, i) => (
          <li key={i}>{e}</li>
        ))}
      </ul>
    </div>
  );
}
