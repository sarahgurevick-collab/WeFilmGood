"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import VideopitchLecteur from "@/components/VideopitchLecteur";
import ContactEnveloppe from "./ContactEnveloppe";
import CoteFiche from "./CoteFiche";
import EventailPersonnages from "./EventailPersonnages";
import OrbiteEquipe from "./OrbiteEquipe";
import MoodboardPhotos from "./MoodboardPhotos";
import styles from "./cadre.module.css";

/**
 * Les langues, puis le drapeau, le pays et l'enveloppe sur la même ligne
 * (14/10, Sarah) : dans le panneau de la biographie, pour tous les membres,
 * jamais sous le portrait.
 */
export function LignesMembre({ m }: { m: MembreEquipe }) {
  return (
    <>
      {m.langues && <p className={styles.detailSous}>{m.langues}</p>}
      {(m.lieu || m.contact) && (
        <p className={`${styles.detailSous} ${styles.lieu}`}>
          {m.lieu && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/drapeaux/${m.lieu.code}.svg`} alt="" />
              {m.lieu.texte}
            </>
          )}
          {m.contact && (
            <span className={styles.enveloppeLigne}>
              <ContactEnveloppe
                href={m.contact.href}
                adhesionRequise={m.contact.adhesionRequise}
                indisponible={m.contact.indisponible}
              />
            </span>
          )}
        </p>
      )}
    </>
  );
}

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
  /** Les langues parlées, en toutes lettres (« Français, anglais ») : sous le
   *  métier, pour ne pas écrire en anglais à qui ne le parle pas (12/10, Sarah). */
  langues?: string | null;
  /** Où la personne vit (12/10, Sarah) : le drapeau, puis « Afrique du Sud ». */
  lieu?: { code: string; texte: string } | null;
  /** L'enveloppe pour lui écrire (14/10 : chaque membre a la sienne, à côté du drapeau). */
  contact?: { href: string; adhesionRequise: boolean; indisponible?: string };
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
 * photos), les personnages, puis l'équipe. Dans le grand cadre, la pastille
 * FR | ENG du videopitch, visible dès l'arrivée (FR par défaut, 25/10).
 */
export default function CadreEquipe({
  equipe,
  personnages,
  moodboard,
  videopitch,
  bandeAnnonce,
  langueProjet,
  image,
  bandeau,
  avis,
  retourSaisie,
  personnageOuvert,
  porteur,
}: {
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
  /** La bande-annonce d'un film tourné (adresse du lecteur) : elle prend la
      place du videopitch dans le cadre (29/10, Sarah). */
  bandeAnnonce?: string | null;
  /** La langue du projet (« fr », « en »…) : choisit le videopitch gardé
      en second choix à côté de la bande-annonce. */
  langueProjet?: string | null;
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
  const [langue, setLangue] = useState<"fr" | "en">(videopitch?.fr ? "fr" : "en");
  const [voirBA, setVoirBA] = useState(true);

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
                      <LignesMembre m={m} />
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
            </li>
          );
        })}
      </ul>
    </div>
  );

  const titreEquipe = equipe.length > 1 ? "Mon équipe" : "L'auteur";

  // La rangée de ronds d'avant (étiquette git personnages-avant-eventail)
  // est remplacée par EventailPersonnages (14/10, Sarah).

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

  // La tagline et le résumé sont sous le titre depuis le 14/10 (AccrocheProjet).

  const deuxLangues = Boolean(videopitch?.fr && videopitch?.en);
  const anglophone = Boolean(langueProjet && langueProjet !== "fr");
  const vpSecond = videopitch
    ? (anglophone ? videopitch.en ?? videopitch.fr : videopitch.fr ?? videopitch.en) ?? null
    : null;

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
          videopitch={
            bandeAnnonce ? (
              <VideopitchLecteur
                fr={vpSecond}
                en={null}
                titre={videopitch?.titre ?? ""}
                lien={voirBA || !vpSecond ? bandeAnnonce : null}
              />
            ) : videopitch && (videopitch.fr || videopitch.en) ? (
              <VideopitchLecteur
                fr={videopitch.fr}
                en={videopitch.en}
                titre={videopitch.titre}
                langue={deuxLangues ? langue : undefined}
              />
            ) : undefined
          }
        />
        {/* Film tourné (29/10, Sarah) : la bande-annonce d'abord ; le
            videopitch en second choix, dans la langue du projet (anglais
            pour un projet anglophone, sinon français). */}
        {bandeAnnonce ? (
          <div className={styles.pastilleLangue} role="group" aria-label="Vidéo">
            {([["ba", "Bande-annonce"], ...(vpSecond ? [["vp", "Videopitch"]] : [])] as [string, string][]).map(([cle, libelle]) => (
              <button
                key={cle}
                type="button"
                className={(cle === "ba") === (voirBA || !vpSecond) ? styles.langueActive : styles.langue}
                aria-pressed={(cle === "ba") === (voirBA || !vpSecond)}
                disabled={!vpSecond}
                onClick={() => setVoirBA(cle === "ba")}
              >
                {libelle}
              </button>
            ))}
          </div>
        ) : (
        /* La langue du videopitch, visible dès l'arrivée (25/10, Sarah :
            « on ne comprend pas qu'en cliquant dessus, on a la vidéo en
            français ») : FR par défaut, la langue en cours en rouge. */
        videopitch && (videopitch.fr || videopitch.en) && (
          <div className={styles.pastilleLangue} role="group" aria-label="Langue du videopitch">
            {(["fr", "en"] as const)
              .filter((l) => videopitch[l])
              .map((l) => (
                <button
                  key={l}
                  type="button"
                  className={(deuxLangues ? langue : videopitch.fr ? "fr" : "en") === l ? styles.langueActive : styles.langue}
                  aria-pressed={(deuxLangues ? langue : videopitch.fr ? "fr" : "en") === l}
                  disabled={!deuxLangues}
                  onClick={() => setLangue(l)}
                >
                  {l === "fr" ? "FR" : "ENG"}
                </button>
              ))}
          </div>
        ))}
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
        // Sans le cadre rouge, comme le reste de la fiche (14/10, Sarah).
        <section className={`${styles.cadre} ${styles.cadreEquipe} ${styles.moodboardGauche} ${styles.sansBord}`}>
          <p className={styles.dessousTitre}>Moodboard</p>
          <MoodboardPhotos photos={moodboard} />
        </section>
      )}

      {avecPersonnages && (
        // L'ancre « personnages » : les cartes des Galaxies ouvrent la fiche
        // directement ici (14/10, Sarah).
        // Sans le cadre rouge (essai du 14/10, Sarah).
        <section id="personnages" className={`${styles.cadre} ${styles.cadreEquipe} ${styles.sansBord}`}>
          <p className={styles.dessousTitre}>Les personnages</p>
          {/* En éventail à partir de trois personnages, les mêmes cartes côte
              à côte en dessous (14/10, Sarah). La rangée de ronds d'avant est
              gardée dans cotePersonnages (étiquette git
              personnages-avant-eventail). */}
          <EventailPersonnages personnages={personnages} ouvert={ouvert} setOuvert={setOuvert} />
        </section>
      )}

      {equipe.length > 0 && (
        // Sans le cadre rouge, comme les personnages (14/10, Sarah).
        <section className={`${styles.cadre} ${styles.cadreEquipe} ${styles.sansBord}`}>
          <p className={styles.dessousTitre}>{titreEquipe}</p>
          {/* À partir de trois personnes, l'équipe en orbite autour du
              porteur (14/10, Sarah) ; la rangée de portraits en dessous. */}
          {equipe.length >= 3 ? (
            <OrbiteEquipe equipe={equipe} porteur={porteur} ouvert={membreOuvert} setOuvert={setMembreOuvert} />
          ) : (
            portraits
          )}
        </section>
      )}
    </div>

      {(detail || avecMoodboard) && (
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
                  {membreChoisi && <LignesMembre m={membreChoisi} />}
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
            </>
          ) : (
            <>
              <p className={styles.dessousTitre}>Moodboard</p>
              <MoodboardPhotos photos={moodboard} />
            </>
          )}
        </aside>
      )}
        </div>
      )}
    </div>
  );
}
