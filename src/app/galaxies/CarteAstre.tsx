import Link from "next/link";
import type { TalentTrouve } from "./actions";
import styles from "./duo.module.css";

/**
 * Un talent dans la constellation (essai du 12/11/2026, Sarah) : un grand
 * portrait rond qui flotte doucement, le nom (quand il est visible), les
 * métiers et la ville dessous.
 */
export default function CarteAstre({ t }: { t: TalentTrouve }) {
  const contenu = (
    <>
      <span className={styles.astrePhoto}>
        {t.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.photo} alt="" loading="lazy" />
        ) : t.masque ? (
          <svg viewBox="0 0 24 24" width="40%" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ) : (
          <span>{t.nom.trim().charAt(0).toUpperCase()}</span>
        )}
      </span>
      {!t.masque && <strong>{t.nom}</strong>}
      {t.metiers.length > 0 && <span className={styles.astreDetail}>{t.metiers.join(", ")}</span>}
      {t.ville && <span className={styles.astreDetail}>{t.ville}</span>}
    </>
  );
  // Depuis le 16/11 (Sarah : contacter un talent sans passer par un projet),
  // toute carte mène au profil : masqué, il s'y ouvre avec un soleil.
  return (
    <Link href={`/membres/${t.id}`} className={styles.astre}>
      {contenu}
    </Link>
  );
}
