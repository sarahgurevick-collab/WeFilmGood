"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import ComparateurAvantApres from "@/components/ComparateurAvantApres";
import VideopitchLecteur from "@/components/VideopitchLecteur";
import CoteFiche from "./CoteFiche";
import styles from "./cadre.module.css";

export type PersonnageCadre = {
  id: string;
  nom: string;
  portrait: string | null;
  infos: string;
  bio: string | null;
};

export type MembreEquipe = {
  cle: string;
  profileId: string | null;
  nom: string;
  role: string | null;
  /** Invitation pas encore acceptée — visible de l'auteur et de l'admin seulement. */
  enAttente: string | null;
  photo?: string | null;
};

/**
 * Le cadre de la fiche projet (ESSAI du 24/09/2026) : un comparateur, la
 * fiche à gauche (image, bouton play du videopitch comme sur
 * WFG 1), les personnages à droite — à défaut, les talents —, la barre au
 * milieu qu'on tire par sa poignée. Sous le cadre, l'« Avis WeFilmGood »
 * s'il y en a un (le bandeau de l'équipe a été retiré le 24/09). Remplace les onglets « Videopitch » / « L'auteur »
 * (OngletsCadre, gardé pour un retour en arrière).
 *
 * Le nombre de fiches de lecture n'est plus affiché sous le cadre (retiré
 * à la demande de Sarah le 24/09).
 *
 * Côté droit (25/09) : le moodboard s'il y a des photos, sinon les
 * personnages, sinon les talents. Quand il y a moodboard ET personnages,
 * l'étiquette du coin devient un bouton qui nomme l'autre vue. Côté
 * gauche, une fois la vidéo lancée : si le videopitch existe aussi en
 * anglais, l'étiquette devient le bouton « Version anglaise » (français
 * par défaut).
 */
export default function CadreEquipe({
  equipe,
  personnages,
  moodboard,
  videopitch,
  image,
  avis,
}: {
  /** Les photos du moodboard (adresses signées). */
  moodboard: string[];
  /** La phrase d'encouragement des lecteurs, pour un projet labellisé. */
  avis: string | null;
  equipe: MembreEquipe[];
  personnages: PersonnageCadre[];
  /** L'image de présentation (adresse signée), s'il y en a une. */
  image: string | null;
  /** Le videopitch (identifiants Vimeo), s'il y en a un. */
  videopitch?: { fr: string | null; en: string | null; titre: string };
}) {
  const avecMoodboard = moodboard.length > 0;
  const avecPersonnages = personnages.length > 0;
  const [vue, setVue] = useState<"moodboard" | "personnages">(
    avecMoodboard ? "moodboard" : "personnages",
  );
  const [videoLancee, setVideoLancee] = useState(false);
  const [langue, setLangue] = useState<"fr" | "en">(videopitch?.fr ? "fr" : "en");

  const portraits = (
    <div className={styles.coteEquipe}>
      <ul className={styles.portraits}>
        {equipe.map((m) => (
          <li key={m.cle} className={m.enAttente ? styles.attente : undefined}>
            <span className={styles.portrait} aria-hidden="true">
              {m.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.photo} alt="" />
              ) : (
                <span>{m.nom.trim().charAt(0).toUpperCase()}</span>
              )}
            </span>
            <span className={styles.nom}>{m.nom}</span>
            {m.role && <strong className={styles.role}>{m.role}</strong>}
            {m.enAttente ? (
              <span className={styles.enAttente}>{m.enAttente}</span>
            ) : (
              m.profileId && (
                <Link href={`/membres/${m.profileId}`} className={styles.voir}>
                  Voir le profil
                </Link>
              )
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  const titreEquipe = equipe.length > 1 ? "Mon équipe" : "L'auteur";

  const cotePersonnages = (
    <div className={styles.coteEquipe}>
      <ul className={styles.personnagesCadre}>
        {personnages.map((c) => (
          <li key={c.id}>
            <span className={styles.portrait} aria-hidden="true">
              {c.portrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.portrait} alt="" />
              ) : (
                <span>{c.nom.trim().charAt(0).toUpperCase()}</span>
              )}
            </span>
            <span className={styles.nom}>{c.nom}</span>
            {c.infos && <span className={styles.infos}>{c.infos}</span>}
            {c.bio && <span className={styles.bio}>{c.bio}</span>}
          </li>
        ))}
      </ul>
    </div>
  );

  const coteMoodboard = (
    <div className={`${styles.coteEquipe} ${styles.coteMoodboard}`}>
      <ul className={styles.moodboardCadre}>
        {moodboard.map((src) => (
          <li key={src}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" draggable={false} />
          </li>
        ))}
      </ul>
    </div>
  );

  // Ce que montre le côté droit, et son étiquette (un bouton quand on
  // peut passer d'une vue à l'autre).
  let droite = portraits;
  let etiquetteDroite: ReactNode = titreEquipe;
  if (avecMoodboard && avecPersonnages) {
    droite = vue === "moodboard" ? coteMoodboard : cotePersonnages;
    etiquetteDroite = (
      <button type="button" onClick={() => setVue(vue === "moodboard" ? "personnages" : "moodboard")}>
        {vue === "moodboard" ? "Les personnages" : "Moodboard"}
      </button>
    );
  } else if (avecMoodboard) {
    droite = coteMoodboard;
    etiquetteDroite = "Moodboard";
  } else if (avecPersonnages) {
    droite = cotePersonnages;
    etiquetteDroite = "Les personnages";
  }

  // Côté gauche : le bouton de langue, seulement une fois la vidéo lancée
  // et s'il y a bien une version anglaise en plus de la française.
  const deuxLangues = Boolean(videopitch?.fr && videopitch?.en);
  const etiquetteGauche: ReactNode =
    videoLancee && deuxLangues ? (
      <button type="button" onClick={() => setLangue(langue === "fr" ? "en" : "fr")}>
        {langue === "fr" ? "Version anglaise" : "Version française"}
      </button>
    ) : (
      "La fiche"
    );

  return (
    <section className={`${styles.cadre} ${styles.cadreComparateur}`}>
      <ComparateurAvantApres
        poigneeSeule
        format="16 / 10"
        etiquettes={[etiquetteGauche, etiquetteDroite]}
        gauche={
          <CoteFiche
            image={image}
            onVideo={() => setVideoLancee(true)}
            videopitch={
              videopitch && (videopitch.fr || videopitch.en) ? (
                <VideopitchLecteur
                  fr={videopitch.fr}
                  en={videopitch.en}
                  titre={videopitch.titre}
                  langue={deuxLangues ? langue : undefined}
                />
              ) : undefined
            }
          />
        }
        droite={droite}
      />
      {/* Sous le cadre : l'« Avis WeFilmGood » d'un projet labellisé, la
          phrase d'encouragement des lecteurs. Rien s'il n'y en a pas. */}
      {avis && (
        <figure className={styles.avis}>
          <blockquote>{avis}</blockquote>
          <figcaption>Avis WeFilmGood</figcaption>
        </figure>
      )}
    </section>
  );
}
