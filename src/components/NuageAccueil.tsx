import Link from "next/link";
import styles from "./NuageAccueil.module.css";

/**
 * Le lien vers l'adhésion, sur la page d'accueil.
 *
 * Jusqu'au 13/11/2026, ce bloc montrait un aperçu du nuage de mots-clés
 * (quinze mots, inertes) et une phrase sur ce qui est réservé aux
 * adhérents. Sarah les a retirés le 13/11, les chiffres de l'accueil
 * (AnneauChiffres) étant arrivés juste au-dessus ; seul le lien reste.
 * Avant : étiquette git accueil-avant-retrait-nuage.
 */
export default function NuageAccueil() {
  return (
    <div className={styles.bloc}>
      <p className={styles.mention}>
        <Link href="/adhesion" className={styles.lien}>
          Découvrir l&apos;adhésion
        </Link>
      </p>
    </div>
  );
}
