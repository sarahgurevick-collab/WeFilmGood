"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Chrono from "@/app/cinecrush/Chrono";
import styles from "./rappel.module.css";

/** La phrase de Sarah (orbite d'adhésion, 06/10), la même que sur la page CinéCrush. */
const ACCROCHE =
  "Le chrono est lancé ! Ce StoryPitch mérite toute ton attention : tu as une semaine pour le découvrir. Laisse un avis en commentaires : ce sont de véritables tremplins magiques pour propulser les histoires !";

/**
 * La fenêtre du rappel CinéCrush (24/11/2026). Fermée par la croix, elle
 * ne revient pas tant que l'onglet reste ouvert (elle ne saute pas au
 * visage à chaque page) ; elle revient à la prochaine visite, jusqu'à ce
 * que le talent ouvre la page CinéCrush. Toute la carte y mène.
 */
export default function FenetreCineCrush({
  semaine,
  date,
  titre,
  tagline,
  image,
  finMs,
}: {
  semaine: string;
  date: string;
  titre: string;
  tagline: string | null;
  image: string | null;
  finMs: number;
}) {
  const cle = `wfg-rappel-cinecrush-${semaine}`;
  const [ouverte, setOuverte] = useState(false);

  useEffect(() => {
    let dejaFermee = false;
    try {
      dejaFermee = sessionStorage.getItem(cle) === "1";
    } catch {
      // Stockage indisponible : la fenêtre s'affiche, c'est tout.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!dejaFermee) setOuverte(true);
  }, [cle]);

  useEffect(() => {
    if (!ouverte) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouverte]);

  function fermer() {
    try {
      sessionStorage.setItem(cle, "1");
    } catch {
      // Sans stockage, elle reviendra à la page suivante.
    }
    setOuverte(false);
  }

  if (!ouverte) return null;

  return (
    <div className={styles.voile} onClick={fermer}>
      <div className={styles.fenetre} role="dialog" aria-modal="true" aria-label="CinéCrush" onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.fermer} onClick={fermer} aria-label="Fermer">
          ×
        </button>
        <Link href="/cinecrush" className={styles.carte} onClick={fermer}>
          {image && (
            <span className={styles.image}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" />
            </span>
          )}
          <span className={styles.texte}>
            <span className={styles.surtitre}>
              CinéCrush <span>· Semaine du {date}</span>
            </span>
            <span className={styles.titre}>{titre}</span>
            {tagline && <span className={styles.tagline}>{tagline}</span>}
            <Chrono finMs={finMs} />
            <span className={styles.accroche}>{ACCROCHE}</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
