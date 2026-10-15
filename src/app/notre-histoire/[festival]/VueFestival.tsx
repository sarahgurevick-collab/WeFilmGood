"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AnneauRelief from "@/components/AnneauRelief";
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
 * changent quand la roue tourne ; en dessous, les photos des rencontres
 * sur l'anneau en relief, une photo qui s'ouvre en grand au clic.
 */
export default function VueFestival({
  nom,
  logo,
  annees,
  selections,
  photos,
}: {
  nom: string;
  logo: string | null;
  annees: number[];
  selections: AnneeSelection[];
  photos: { image: string; legende: string }[];
}) {
  const [annee, setAnnee] = useState<number>(annees[0] ?? 0);
  const [photoOuverte, setPhotoOuverte] = useState<{ image: string; legende: string } | null>(null);
  const choisie = selections.find((s) => s.annee === annee);
  // Les sélections sans année (SATIS…) s'affichent sous la liste.
  const sansAnnee = selections.filter((s) => s.annee === undefined);

  useEffect(() => {
    if (!photoOuverte) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPhotoOuverte(null);
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, [photoOuverte]);

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

      {photos.length > 0 && (
        <>
          <h2 className={styles.sousTitre}>Les rencontres</h2>
          <AnneauRelief
            largeurElement={220}
            hauteurElement={150}
            elements={photos.map((p, i) => ({
              id: `photo-${i}`,
              legende: p.legende,
              onClick: () => setPhotoOuverte(p),
              contenu: (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt={p.legende} className="photo" draggable={false} loading="lazy" />
              ),
            }))}
          />
        </>
      )}

      {photoOuverte && (
        <div className={styles.voile} onClick={() => setPhotoOuverte(null)} role="presentation">
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={photoOuverte.legende}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoOuverte.image} alt={photoOuverte.legende} className={styles.grande} />
            <p className={styles.grandeLegende}>{photoOuverte.legende}</p>
          </div>
          <button type="button" className={styles.fermer} onClick={() => setPhotoOuverte(null)} aria-label="Fermer">
            ×
          </button>
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
