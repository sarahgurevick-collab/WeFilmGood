import Link from "next/link";
import type { Match, ThemesMatch } from "./match";
import styles from "./match.module.css";

const THEMES: { cle: keyof ThemesMatch; titre: string }[] = [
  { cle: "styles", titre: "Sous-genres & styles" },
  { cle: "sujets", titre: "Sujets & personnages" },
  { cle: "univers", titre: "Univers & Lieux" },
];

/**
 * La carte du match (Sarah, 23/11/2026) : le projet de la plateforme le
 * plus proche de celui de l'auteur, par les mots-clés. Un seul par projet.
 *
 *  · tant qu'il n'y a pas 3 mots dans chacun des 3 thèmes : la jauge à
 *    trois segments (un par thème) et l'invitation à les remplir ;
 *  · adhérent : le projet, les mots en commun, la fiche et le message ;
 *  · sans adhésion : les mots en commun, la vignette du match floutée par
 *    le serveur dans l'image elle-même (même verrou que les photos des
 *    talents ; une image neutre si le match n'a pas de vignette), et l'adhésion.
 *
 * Le pourcentage n'est jamais affiché : on montre les mots en commun.
 * Textes validés par Sarah le 23/11.
 */
export default function CarteMatch({
  themes,
  seuil,
  match,
  nouvelOnglet = false,
}: {
  /** Les mots choisis par thème : ceux de la base, ou ceux de l'écran pendant la saisie. */
  themes: ThemesMatch;
  seuil: number;
  match: Match | null;
  /** Dans le formulaire de la fiche : les liens s'ouvrent à côté, pour ne rien perdre de la saisie. */
  nouvelOnglet?: boolean;
}) {
  const pret = THEMES.every(({ cle }) => themes[cle] >= seuil);
  const mots = pret ? (match?.motsCommuns ?? null) : null;
  const cible = nouvelOnglet ? { target: "_blank", rel: "noopener" } : {};

  return (
    <section className={styles.carte} aria-labelledby="match-titre">
      <div className={styles.entete}>
        <h3 id="match-titre" className={styles.titre}>
          Le match de votre projet
        </h3>
        <span className={styles.jauge} aria-hidden="true">
          {THEMES.map(({ cle, titre }) => (
            <span key={cle} className={styles.segment} data-plein={themes[cle] >= seuil} title={titre} />
          ))}
        </span>
      </div>

      {!pret && (
        <p className={styles.texte}>
          Choisissez au moins {seuil} mots-clés dans chacun des 3 thèmes pour découvrir le projet le plus proche du
          vôtre.
        </p>
      )}

      {mots && match && (
        <>
          {match.nouveau && (
            <p className={styles.nouveau}>Nouveau match : un projet encore plus proche du vôtre vient d&apos;arriver.</p>
          )}
          <div className={styles.corps}>
            {match.projet ? (
              match.projet.vignette ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={styles.vignette} src={match.projet.vignette} alt="" />
              ) : (
                <span className={styles.vignette} aria-hidden="true" />
              )
            ) : match.vignetteFloue ? (
              // Floutée par le serveur, dans l'image elle-même : la vraie vignette n'arrive jamais ici.
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.vignette} src={match.vignetteFloue} alt="" />
            ) : (
              <span className={`${styles.vignette} ${styles.floue}`} aria-hidden="true" />
            )}
            <div className={styles.infos}>
              {match.projet ? (
                <>
                  <strong className={styles.titreProjet}>{match.projet.titre}</strong>
                  {match.projet.tagline && <span className={styles.tagline}>{match.projet.tagline}</span>}
                </>
              ) : (
                <>
                  <span className={`${styles.ligneFloue} ${styles.ligneLongue}`} aria-hidden="true" />
                  <span className={styles.ligneFloue} aria-hidden="true" />
                </>
              )}
              <p className={styles.mots}>
                {mots.length} mot{mots.length > 1 ? "s" : ""} en commun&nbsp;: <span>{mots.join(", ")}</span>
              </p>
              {match.projet ? (
                <div className={styles.boutons}>
                  <Link href={`/projet/${match.projet.id}`} className={styles.bouton} {...cible}>
                    Voir la fiche
                  </Link>
                  <Link href={`/mes-messages/nouveau?projet=${match.projet.id}`} className={styles.boutonPlein} {...cible}>
                    Écrire à l&apos;auteur
                  </Link>
                </div>
              ) : (
                <>
                  <p className={styles.texte}>Adhérez pour découvrir ce projet et écrire à son auteur.</p>
                  <div className={styles.boutons}>
                    <Link href="/adhesion" className={styles.boutonPlein} {...cible}>
                      Adhérer
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
