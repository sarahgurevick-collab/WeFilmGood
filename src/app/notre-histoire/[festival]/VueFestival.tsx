"use client";

import Link from "next/link";
import { useState } from "react";
import RoueAnnees from "@/components/RoueAnnees";
import type { AnneeSelection } from "@/data/selectionsCannes";
import { ancreProgramme, decouperLigne, type LiensSelection } from "../rapprochement";
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
 *
 * 22/10 : chaque ligne « Titre - Auteur - Pays » relie le titre à sa fiche
 * et le nom à son profil quand la base les a retrouvés (liens), pour les
 * membres connectés. La frise arrive sur une année (anneeInitiale) et un
 * programme (ancre).
 */
export default function VueFestival({
  nom,
  logo,
  logoRond = false,
  annees,
  anneeInitiale,
  selections,
  liens = {},
}: {
  nom: string;
  logo: string | null;
  logoRond?: boolean;
  annees: number[];
  anneeInitiale?: number;
  selections: AnneeSelection[];
  liens?: LiensSelection;
}) {
  const [annee, setAnnee] = useState<number>(anneeInitiale ?? annees[0] ?? 0);
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
          <span className={logoRond ? styles.enteteLogoRond : styles.enteteLogo}>
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
                  <Bloc key={i} titre={bloc.titre} entrees={bloc.entrees} liens={liens} />
                ))}
              </>
            )}
            {sansAnnee.map((s, i) =>
              s.blocs.map((bloc, j) => (
                <Bloc key={`${i}-${j}`} titre={bloc.titre} entrees={bloc.entrees} liens={liens} />
              )),
            )}
          </div>
        </div>
      )}

      <span hidden>{nom}</span>
    </>
  );
}

function Bloc({
  titre,
  entrees,
  liens,
}: {
  titre: string;
  entrees: string[];
  liens: LiensSelection;
}) {
  const rouge = PROGRAMMES_EN_ROUGE.some((p) => titre.includes(p));
  return (
    <div className={styles.bloc} id={ancreProgramme(titre)}>
      <h3 className={rouge ? styles.blocTitreRouge : styles.blocTitre}>{titre}</h3>
      <ul className={styles.entrees}>
        {entrees.map((e, i) => (
          <li key={i}>
            <Entree brut={e} lien={liens[e]} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/* « Titre - Auteur - Pays » : le titre et le nom deviennent des liens quand
   la fiche et le profil existent ; sinon la ligne reste telle quelle. */
function Entree({ brut, lien }: { brut: string; lien?: { projet?: string; membre?: string } }) {
  if (!lien?.projet && !lien?.membre) return <>{brut}</>;
  const l = decouperLigne(brut);
  const titreAffiche = brut.split(" - ")[0]?.trim() ?? l.titre;
  return (
    <>
      {lien.projet ? (
        <Link href={`/projet/${lien.projet}`} className={styles.lienEntree}>
          {titreAffiche}
        </Link>
      ) : (
        titreAffiche
      )}
      {l.auteur && (
        <>
          {" - "}
          {lien.membre ? (
            <Link href={`/membres/${lien.membre}`} className={styles.lienEntree}>
              {l.auteur}
            </Link>
          ) : (
            l.auteur
          )}
        </>
      )}
      {l.reste && (l.reste.startsWith("(") ? ` ${l.reste}` : ` - ${l.reste}`)}
    </>
  );
}
