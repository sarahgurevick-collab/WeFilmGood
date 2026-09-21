import Link from "next/link";
import type { ReactNode } from "react";
import OngletsCadre from "./OngletsCadre";
import styles from "./cadre.module.css";

export type MembreEquipe = {
  cle: string;
  profileId: string | null;
  nom: string;
  role: string | null;
  /** Invitation pas encore acceptée — visible de l'auteur et de l'admin seulement. */
  enAttente: string | null;
};

/**
 * Le cadre de la fiche projet, repris de WFG 1 : les onglets « Videopitch »
 * et « Mon équipe » posés sur la bordure, les talents en pastilles, et en
 * pied de cadre le nombre de fiches de lecture.
 *
 * Le nombre de lectures se voit de tous : plusieurs lectures montrent un
 * auteur qui travaille. Le contenu ne s'ouvre qu'à l'auteur et à
 * l'administration, dans un autre onglet — les autres sont invités à le
 * demander à l'auteur.
 */
export default function CadreEquipe({
  projectId,
  equipe,
  nombreFiches,
  peutLireFiches,
  videopitch,
}: {
  projectId: string;
  equipe: MembreEquipe[];
  nombreFiches: number;
  peutLireFiches: boolean;
  /** Le lecteur vidéo, s'il y a un videopitch : il devient le premier onglet. */
  videopitch?: ReactNode;
}) {
  const equipeListe = (
    <ul className={styles.equipe}>
      {equipe.map((m) => (
        <li key={m.cle} className={`${styles.pastille} ${m.enAttente ? styles.attente : ""}`}>
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
  );

  return (
    <section className={styles.cadre}>
      <OngletsCadre
        onglets={[
          ...(videopitch ? [{ cle: "videopitch", titre: "Videopitch", contenu: videopitch }] : []),
          // Seul sur son projet, l'auteur n'a pas d'« équipe ».
          { cle: "equipe", titre: equipe.length > 1 ? "Mon équipe" : "L'auteur", contenu: equipeListe },
        ]}
      />

      {nombreFiches > 0 && (
        <p className={styles.fiches}>
          {peutLireFiches ? (
            <a
              href={`/projets/${projectId}/fiches`}
              target="_blank"
              rel="noopener"
              title="Ouvrir les fiches de lecture dans un nouvel onglet"
            >
              {nombreFiches} fiche{nombreFiches > 1 ? "s" : ""} de lecture{" "}
              <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <>
              {nombreFiches} fiche{nombreFiches > 1 ? "s" : ""} de lecture
              <span className={styles.discret}>
                {" "}— confidentielle{nombreFiches > 1 ? "s" : ""},{" "}
                <a href="#contacter">à demander à l&apos;auteur</a>
              </span>
            </>
          )}
        </p>
      )}
    </section>
  );
}
