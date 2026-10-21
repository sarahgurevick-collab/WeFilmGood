"use client";

import { useState } from "react";
import formStyles from "./form.module.css";
import RoueTitres from "./RoueTitres";
import styles from "./MasterclassLecteur.module.css";

export type Masterclass = {
  titre: string;
  vimeoId: string;
  /** Le film dont parle la masterclass, en italique sous le titre (16/10). */
  film?: string;
  /** L'affiche du film : elle remplace l'écran jusqu'au clic, puis la vidéo démarre (20/10). */
  affiche?: string;
  /** Le teaser (bande-annonce) du film, ouvert dans un autre onglet (20/10). */
  teaser?: string;
  /**
   * Le mur d'affiches (21/10) : pour une masterclass où le réalisateur parle de
   * toute sa carrière (Clermont-Ferrand), les affiches de ses films remplacent
   * celle d'un seul film. Cliquer une affiche donne le film et son teaser.
   */
  mur?: AfficheDuMur[];
};

export type AfficheDuMur = {
  image: string;
  /** « Loin des hommes », ou « L'Affaire SK1 (Frédéric TELLIER) » quand le réalisateur de la masterclass n'a pas signé la mise en scène. */
  film: string;
  annee?: number;
  teaser?: string;
};

/** Un peu de travers, comme collées au mur : l'inclinaison et le décalage de chaque affiche. */
const INCLINAISONS = [-4, 3, -2, 4, -3, 2, -4, 3, -2];
const DECALAGES = [2, -3, 3, -2, 2, -3, 3, -2, 2];

/** « Jacques FIESCHI - Cannes 2012 » → le nom, puis le festival et l'année. */
function decouper(titre: string): { nom: string; sous: string } {
  const m = titre.match(/^(.*?)\s*-?\s*((?:Cannes|Clermont-Ferrand)\s+\d{4})\s*$/);
  if (!m) return { nom: titre, sous: "" };
  return { nom: m[1].replace(/\s*-\s*$/, "").trim(), sous: m[2] };
}

/**
 * Les masterclass (15/10/2026, Sarah) : l'écran vidéo à gauche, et à
 * droite la roue des titres — les noms et les années — comme le « Wheel
 * Carousel » de 21st.dev. Le titre du centre est celui qui joue.
 */
export default function MasterclassLecteur({
  masterclasses,
  parDefaut,
}: {
  masterclasses: Masterclass[];
  /** La masterclass montrée à l'arrivée (identifiant Vimeo) ; sinon la première. */
  parDefaut?: string;
}) {
  const [id, setId] = useState(
    masterclasses.some((m) => m.vimeoId === parDefaut) ? (parDefaut as string) : (masterclasses[0]?.vimeoId ?? ""),
  );
  // La masterclass dont l'affiche a été cliquée : sa vidéo est lancée, jusqu'à ce qu'on en choisisse une autre.
  const [lancee, setLancee] = useState<string | null>(null);
  // L'affiche du mur mise en avant (son numéro), pour montrer le film et son teaser.
  const [choisie, setChoisie] = useState<number | null>(null);
  const actuelle = masterclasses.find((m) => m.vimeoId === id) ?? masterclasses[0];
  const teaserAffiche =
    actuelle.mur && lancee !== actuelle.vimeoId
      ? choisie !== null
        ? actuelle.mur[choisie]?.teaser
        : undefined
      : actuelle.teaser;
  const titres = masterclasses.map((m) => {
    const { nom, sous } = decouper(m.titre);
    // Le festival et l'année vont à côté du film, sous le nom (20/10) : à côté du nom, c'était trop long.
    return { id: m.vimeoId, label: nom, dessous: m.film, apres: sous };
  });

  return (
    <div className={styles.lecteur}>
      <div className={styles.colonneEcran}>
      <div className={styles.ecran}>
        {actuelle.mur && lancee !== actuelle.vimeoId ? (
          <div className={styles.mur}>
            <div className={styles.rangee}>
              {actuelle.mur.map((a, i) => (
                <button
                  key={a.image}
                  type="button"
                  className={choisie === i ? styles.carteChoisie : styles.carte}
                  style={{
                    ["--inclinaison" as string]: `${INCLINAISONS[i % INCLINAISONS.length]}deg`,
                    ["--decalage" as string]: `${DECALAGES[i % DECALAGES.length]}%`,
                    animationDelay: `${i * 90}ms`,
                  }}
                  onClick={() => setChoisie(choisie === i ? null : i)}
                  aria-pressed={choisie === i}
                  aria-label={a.film}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.image} alt={`Affiche : ${a.film}`} />
                </button>
              ))}
            </div>
            <div className={styles.pied}>
              <p className={styles.legende}>
                {choisie !== null && (
                  <>
                    <em>{actuelle.mur[choisie].film}</em>
                    {actuelle.mur[choisie].annee && <span> - {actuelle.mur[choisie].annee}</span>}
                  </>
                )}
              </p>
              <button
                type="button"
                className={styles.lireMur}
                onClick={() => setLancee(actuelle.vimeoId)}
                aria-label={`Lire la masterclass : ${actuelle.titre}`}
              >
                <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
                  <path d="M8 5v14l11-7z" fill="#fff" />
                </svg>
              </button>
            </div>
          </div>
        ) : actuelle.affiche && lancee !== actuelle.vimeoId ? (
          <button
            type="button"
            className={styles.affiche}
            onClick={() => setLancee(actuelle.vimeoId)}
            aria-label={`Lire la masterclass : ${actuelle.titre}`}
          >
            {/* Le même visuel flouté remplit l'écran, l'affiche (portrait) au centre. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={actuelle.affiche} alt="" className={styles.fond} aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={actuelle.affiche} alt={`Affiche : ${actuelle.film ?? actuelle.titre}`} className={styles.visuel} />
            <span className={styles.lire} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path d="M8 5v14l11-7z" fill="#fff" />
              </svg>
            </span>
          </button>
        ) : (
          <iframe
            key={actuelle.vimeoId}
            src={`https://player.vimeo.com/video/${actuelle.vimeoId}${actuelle.affiche ? "?autoplay=1" : ""}`}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={actuelle.titre}
          />
        )}
      </div>
      {teaserAffiche && (
        <a href={teaserAffiche} target="_blank" rel="noopener noreferrer" className={`${formStyles.submit} ${styles.teaser}`}>
          Voir le teaser du film
        </a>
      )}
      </div>
      <RoueTitres titres={titres} valeur={id} onChange={(nouveau) => {
          setId(nouveau);
          // Quand on change de masterclass, la vidéo lancée s'arrête : en revenant, on retrouve l'affiche.
          setLancee(null);
          setChoisie(null);
        }} etiquette="Choisir une masterclass" />
    </div>
  );
}
