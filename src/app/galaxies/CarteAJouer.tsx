import Link from "next/link";
import type { PersonnageTrouve } from "./actions";
import styles from "./duo.module.css";

/**
 * Un personnage en carte à jouer (essai du 12/11/2026, Sarah) : le
 * portrait en pleine carte, l'initiale et un point rouge dans le coin
 * comme l'index d'une carte, le nom, le sexe et l'âge, le comédien
 * envisagé en bas. Le dos rouge ne se voit que pendant que la carte sort
 * du Finder.
 */
export default function CarteAJouer({ c }: { c: PersonnageTrouve }) {
  const initiale = c.nom.trim().charAt(0).toUpperCase();
  return (
    <>
      <Link href={`/projet/${c.projetId}?personnage=${c.id}#personnage-${c.id}`} className={styles.face}>
        {c.portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.portrait} alt="" loading="lazy" style={{ objectPosition: c.cadrage }} />
        ) : (
          <span className={styles.sansPortrait}>{initiale}</span>
        )}
        <span className={styles.index} aria-hidden="true">
          {initiale}
          <i />
        </span>
        <span className={styles.bas}>
          <strong>{c.nom}</strong>
          {c.sexeEtAge && <span>{c.sexeEtAge}</span>}
          {c.comedien && <span>{c.comedien}</span>}
        </span>
      </Link>
      <span className={styles.dos} aria-hidden="true" />
    </>
  );
}
