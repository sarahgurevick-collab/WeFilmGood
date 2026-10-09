"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import VideopitchLecteur from "@/components/VideopitchLecteur";
import CoteFiche from "./CoteFiche";
import MoodboardPhotos from "./MoodboardPhotos";
import styles from "./cadre.module.css";

export type PersonnageCadre = {
  id: string;
  nom: string;
  portrait: string | null;
  /** Le cadrage du portrait : « x% y% » (object-position). */
  cadrage?: string;
  /** Le portrait a été posé par WeFilmGood. */
  proposee?: boolean;
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
  /** Le portrait déplie biographie et site au clic (sinon : lien vers le profil). */
  deplie?: boolean;
  bio?: string | null;
  site?: string | null;
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
 * Sous le grand cadre (03/10, Sarah : un seul bouton pour deux contenus ne
 * se comprenait pas), un cadre par contenu, chacun avec son titre fixe et
 * sans bouton pour passer de l'un à l'autre : le moodboard (s'il y a des
 * photos), les personnages, puis l'équipe. Dans le grand cadre, une fois la
 * vidéo lancée : si le videopitch existe aussi en anglais, l'étiquette
 * devient le bouton « Version anglaise » (français par défaut).
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
  accroche,
  resume,
  plus,
  contact,
  porteur,
}: {
  /** La tagline : l'accroche du projet, obligatoire. */
  accroche?: string | null;
  /** La logline : le résumé, en plus petit sous la tagline. */
  resume?: string | null;
  /** « Plus… » : informations supplémentaires (lien vers un teaser, sélections…). */
  plus?: string | null;
  /** L'enveloppe pour écrire au porteur du projet (rien pour l'auteur lui-même). */
  contact?: ReactNode;
  /** La clé du porteur du projet dans l'équipe : l'enveloppe se pose sous son portrait. */
  porteur?: string | null;
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
  // Un clic sur un personnage ou sur un membre de l'équipe montre sa
  // biographie ; un second clic la replie. Un seul à la fois : sur grand
  // écran elle s'affiche dans le cadre de droite, sinon sous le portrait.
  const [choix, setChoix] = useState<{ genre: "personnage" | "membre"; id: string } | null>(
    arrivee ? { genre: "personnage", id: arrivee } : null,
  );
  const ouvert = choix?.genre === "personnage" ? choix.id : null;
  const membreOuvert = choix?.genre === "membre" ? choix.id : null;
  const setOuvert = (id: string | null) => setChoix(id ? { genre: "personnage", id } : null);
  const setMembreOuvert = (id: string | null) => setChoix(id ? { genre: "membre", id } : null);
  useEffect(() => {
    if (arrivee) document.getElementById(`personnage-${arrivee}`)?.scrollIntoView({ block: "center" });
  }, [arrivee]);
  const [videoLancee, setVideoLancee] = useState(false);
  const [langue, setLangue] = useState<"fr" | "en">(videopitch?.fr ? "fr" : "en");

  // Chaque membre est un lien : la photo, le nom et le rôle mènent au
  // profil, comme un talent ou un personnage (plus de bouton « Voir le
  // profil », 03/10). Sans profil (invitation en attente, adhésion
  // manquante) : pas de lien.
  const portraits = (
    <div className={styles.coteEquipe}>
      <ul className={styles.portraits}>
        {equipe.map((m) => {
          const contenu = (
            <>
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
              {m.enAttente && <span className={styles.enAttente}>{m.enAttente}</span>}
            </>
          );
          const ouvertIci = membreOuvert === m.cle;
          // L'enveloppe pour écrire vit sous le portrait du porteur du projet
          // (09/10, Sarah), plus sous la tagline : on écrit à une personne, à
          // propos de ce projet. Barrée sans adhésion, comme avant.
          const enveloppe = contact && m.cle === porteur ? <div className={styles.contact}>{contact}</div> : null;
          return (
            <li
              key={m.cle}
              className={[m.enAttente ? styles.attente : "", ouvertIci ? styles.personnageOuvert : ""].join(" ").trim() || undefined}
            >
              {m.deplie ? (
                <>
                  <button
                    type="button"
                    className={`${styles.membreLien} ${styles.personnageBouton}`}
                    aria-expanded={ouvertIci}
                    onClick={() => setMembreOuvert(ouvertIci ? null : m.cle)}
                  >
                    {contenu}
                  </button>
                  {ouvertIci && (
                    <div className={styles.membreDetail}>
                      <p>{m.bio || "Ce membre n'a pas encore rédigé sa biographie."}</p>
                      {m.site && (
                        <p>
                          <a href={m.site} target="_blank" rel="noopener noreferrer">
                            Son site
                          </a>
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : !m.enAttente && m.profileId ? (
                <Link href={`/membres/${m.profileId}`} className={styles.membreLien}>
                  {contenu}
                </Link>
              ) : (
                <div className={styles.membreLien}>{contenu}</div>
              )}
              {enveloppe}
            </li>
          );
        })}
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
                  <img src={c.portrait} alt="" style={{ objectPosition: c.cadrage }} />
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

  // Le cadre de droite (grand écran) : le moodboard, remplacé par la biographie de celui ou celle sur qui on a cliqué.
  const personnageChoisi = ouvert ? personnages.find((c) => c.id === ouvert) : undefined;
  const membreChoisi = membreOuvert ? equipe.find((m) => m.cle === membreOuvert) : undefined;
  const detail = personnageChoisi
    ? {
        nom: personnageChoisi.nom,
        image: personnageChoisi.portrait,
        cadrage: personnageChoisi.cadrage,
        proposee: personnageChoisi.proposee && Boolean(personnageChoisi.portrait),
        sous: personnageChoisi.infos,
        bio: personnageChoisi.bio,
        site: null as string | null | undefined,
      }
    : membreChoisi
      ? {
          nom: membreChoisi.nom,
          image: membreChoisi.photo ?? null,
          sous: membreChoisi.role,
          bio: membreChoisi.bio || "Ce membre n'a pas encore rédigé sa biographie.",
          site: membreChoisi.site,
        }
      : null;

  // Sous le moodboard (ou sa remplaçante, la biographie) : la tagline et le
  // résumé (03/10, Sarah). Toujours visibles : ils ne disparaissent pas
  // quand on ouvre une biographie. L'enveloppe, elle, est sous le portrait
  // du porteur (09/10) et reprise dans sa biographie dépliée.
  const avecAccroche = Boolean(accroche || resume || plus);
  const blocAccroche = (
    <>
      {accroche && <p className={styles.accroche}>{accroche}</p>}
      {resume && <p className={styles.resume}>{resume}</p>}
      {plus && <p className={styles.resume}>{plus}</p>}
    </>
  );
  const contactDuDetail = contact && membreChoisi && membreChoisi.cle === porteur ? contact : null;

  const deuxLangues = Boolean(videopitch?.fr && videopitch?.en);

  return (
    <div className={styles.colonnes}>
    <div>
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

      {/* Sous le cadre : l'« Avis WeFilmGood » d'un projet labellisé, la
          phrase d'encouragement des lecteurs. Rien s'il n'y en a pas. */}
      {avis && (
        <figure className={styles.avis}>
          <blockquote>{avis}</blockquote>
          <figcaption>Avis WeFilmGood</figcaption>
        </figure>
      )}
    </section>

      {/* Un cadre rouge par contenu (03/10), sous le grand cadre : le moodboard,
          les personnages, puis l'équipe, qu'on distingue d'un coup d'œil. */}
      {avecMoodboard && (
        <section className={`${styles.cadre} ${styles.cadreEquipe} ${styles.moodboardGauche}`}>
          <p className={styles.dessousTitre}>Moodboard</p>
          <MoodboardPhotos photos={moodboard} />
        </section>
      )}

      {avecAccroche && (
        <section className={`${styles.cadre} ${styles.cadreEquipe} ${styles.accrocheGauche}`}>
          {blocAccroche}
        </section>
      )}

      {avecPersonnages && (
        <section className={`${styles.cadre} ${styles.cadreEquipe}`}>
          <p className={styles.dessousTitre}>Les personnages</p>
          {cotePersonnages}
        </section>
      )}

      {equipe.length > 0 && (
        <section className={`${styles.cadre} ${styles.cadreEquipe}`}>
          <p className={styles.dessousTitre}>{titreEquipe}</p>
          {portraits}
        </section>
      )}
    </div>

      {(detail || avecMoodboard || avecAccroche) && (
        <div className={styles.droite}>
      {(detail || avecMoodboard) && (
        <aside
          className={`${styles.detail} ${detail ? "" : styles.detailMoodboard}`}
          aria-live={detail ? "polite" : undefined}
        >
          {detail ? (
            <>
              <button
                type="button"
                className={styles.detailFermer}
                onClick={() => setChoix(null)}
                aria-label="Fermer"
              >
                ×
              </button>
              <div className={styles.detailTete}>
                <span className={styles.portrait} aria-hidden="true">
                  {detail.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={detail.image} alt="" style={{ objectPosition: detail.cadrage }} />
                  ) : (
                    <span>{detail.nom.trim().charAt(0).toUpperCase()}</span>
                  )}
                </span>
                <div>
                  <h2 className={styles.detailNom}>{detail.nom}</h2>
                  {detail.sous && <p className={styles.detailSous}>{detail.sous}</p>}
                  {detail.proposee && <p className={styles.detailPropose}>Proposée par WeFilmGood</p>}
                </div>
              </div>
              {detail.bio && <p className={styles.detailBio}>{detail.bio}</p>}
              {detail.site && (
                <p className={styles.detailBio}>
                  <a href={detail.site} target="_blank" rel="noopener noreferrer">
                    Son site
                  </a>
                </p>
              )}
              {contactDuDetail && <div className={styles.contact}>{contactDuDetail}</div>}
            </>
          ) : (
            <>
              <p className={styles.dessousTitre}>Moodboard</p>
              <MoodboardPhotos photos={moodboard} />
            </>
          )}
        </aside>
      )}
      {avecAccroche && (
        <section className={`${styles.cadre} ${styles.cadreEquipe} ${styles.accrocheDroite}`}>
          {blocAccroche}
        </section>
      )}
        </div>
      )}
    </div>
  );
}
