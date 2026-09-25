import Link from "next/link";
import type { ReactNode } from "react";
import ComparateurAvantApres from "@/components/ComparateurAvantApres";
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
 */
export default function CadreEquipe({
  equipe,
  personnages,
  videopitch,
  image,
  avis,
}: {
  /** La phrase d'encouragement des lecteurs, pour un projet labellisé. */
  avis: string | null;
  equipe: MembreEquipe[];
  personnages: PersonnageCadre[];
  /** L'image de présentation (adresse signée), s'il y en a une. */
  image: string | null;
  /** Le lecteur vidéo, s'il y a un videopitch : il devient le premier onglet. */
  videopitch?: ReactNode;
}) {
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

  const avecPersonnages = personnages.length > 0;

  return (
    <section className={`${styles.cadre} ${styles.cadreComparateur}`}>
      <ComparateurAvantApres
        poigneeSeule
        format="16 / 10"
        etiquettes={["La fiche", avecPersonnages ? "Les personnages" : titreEquipe]}
        gauche={<CoteFiche image={image} videopitch={videopitch} />}
        droite={avecPersonnages ? cotePersonnages : portraits}
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
