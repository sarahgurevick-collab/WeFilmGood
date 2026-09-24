import Link from "next/link";
import type { ReactNode } from "react";
import ComparateurAvantApres from "@/components/ComparateurAvantApres";
import CoteFiche from "./CoteFiche";
import styles from "./cadre.module.css";

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
 * Le cadre de la fiche projet (ESSAI du 24/09/2026, idée de Sarah : « d'un
 * côté la fiche, de l'autre les talents ») : un comparateur, la fiche à
 * gauche (image, tagline, videopitch), les talents à droite, la barre au
 * milieu qu'on tire par sa poignée. Remplace les onglets « Videopitch » /
 * « L'auteur » (OngletsCadre, gardé pour un retour en arrière).
 *
 * Le nombre de fiches de lecture n'est plus affiché sous le cadre (retiré
 * à la demande de Sarah le 24/09).
 */
export default function CadreEquipe({
  equipe,
  videopitch,
  image,
  tagline,
}: {
  equipe: MembreEquipe[];
  /** L'image de présentation (adresse signée), s'il y en a une. */
  image: string | null;
  tagline: string | null;
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

  return (
    <section className={`${styles.cadre} ${styles.cadreComparateur}`}>
      <ComparateurAvantApres
        poigneeSeule
        format="16 / 10"
        etiquettes={["La fiche", "Les talents"]}
        gauche={<CoteFiche image={image} tagline={tagline} videopitch={videopitch} />}
        droite={portraits}
      />
    </section>
  );
}
