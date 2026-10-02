"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
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
  bandeau,
  avis,
  retourSaisie,
  personnageOuvert,
}: {
  /** Le personnage sur lequel on arrive depuis la recherche : biographie dépliée. */
  personnageOuvert?: string | null;
  /** Les photos du moodboard (adresses signées). */
  moodboard: string[];
  /** La phrase d'encouragement des lecteurs, pour un projet labellisé. */
  avis: string | null;
  equipe: MembreEquipe[];
  personnages: PersonnageCadre[];
  /** L'image de présentation (adresse signée), s'il y en a une. */
  image: string | null;
  /** Le bandeau posé par l'administration (Signé, Tourné…), s'il y en a un. */
  bandeau?: string | null;
  /** Le videopitch (identifiants Vimeo), s'il y en a un. */
  videopitch?: { fr: string | null; en: string | null; titre: string };
  /** Pour l'auteur et l'admin : la page de saisie où ramène un clic sur l'image. */
  retourSaisie?: string | null;
}) {
  const avecMoodboard = moodboard.length > 0;
  const avecPersonnages = personnages.length > 0;
  const arrivee = personnages.some((c) => c.id === personnageOuvert) ? (personnageOuvert as string) : null;
  // En arrivant sur un personnage, ses voisins passent avant le moodboard.
  const [vue, setVue] = useState<"moodboard" | "personnages">(
    avecMoodboard && !arrivee ? "moodboard" : "personnages",
  );
  // Un clic sur un personnage déplie sa biographie ; un second la replie.
  const [ouvert, setOuvert] = useState<string | null>(arrivee);
  useEffect(() => {
    if (arrivee) document.getElementById(`personnage-${arrivee}`)?.scrollIntoView({ block: "center" });
  }, [arrivee]);
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
          <li
            key={c.id}
            id={`personnage-${c.id}`}
            className={ouvert === c.id ? styles.personnageOuvert : undefined}
          >
            <button
              type="button"
              className={styles.personnageBouton}
              aria-expanded={ouvert === c.id}
              onClick={() => setOuvert(ouvert === c.id ? null : c.id)}
            >
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
            </button>
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

  const deuxLangues = Boolean(videopitch?.fr && videopitch?.en);

  return (
    <section className={`${styles.cadre} ${styles.cadreComparateur}`}>
      {/* Plus de comparateur (27/09, Sarah : l'effet n'apportait rien) :
          la fiche seule dans le cadre, le reste en dessous. Page d'avant :
          étiquette git « fiche-projet-avant-retrait-comparateur ». */}
      <div className={styles.ecranFiche}>
        <CoteFiche
          image={image}
          bandeau={bandeau ?? null}
          lienRetour={retourSaisie ?? null}
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
        {videoLancee && deuxLangues && (
          <button
            type="button"
            className={styles.pastilleLangue}
            onClick={() => setLangue(langue === "fr" ? "en" : "fr")}
          >
            {langue === "fr" ? "Version anglaise" : "Version française"}
          </button>
        )}
      </div>

      <div className={styles.dessous}>
        <p className={styles.dessousTitre}>{etiquetteDroite}</p>
        {droite}
      </div>

      {/* « Mon équipe » reste toujours visible (remis le 28/09) : avant, il
          disparaissait dès qu'il y avait un moodboard ou des personnages. */}
      {droite !== portraits && equipe.length > 0 && (
        <div className={styles.dessous}>
          <p className={styles.dessousTitre}>{titreEquipe}</p>
          {portraits}
        </div>
      )}

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
