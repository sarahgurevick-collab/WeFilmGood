import Link from "next/link";
import { nuagePublic } from "@/app/pitchotheque/actions";
import styles from "./NuageAccueil.module.css";

/**
 * L'aperçu du nuage de mots-clés sur la page d'accueil.
 *
 * Volontairement inerte : les mots ne sont pas cliquables et ne portent
 * aucun chiffre. Ils montrent que le fonds est réel et thématiquement
 * riche, sans rien en livrer — le nuage complet, les effectifs et la
 * recherche par mots-clés sont l'un des avantages de l'adhésion.
 */
const APERCU = 15;

export default async function NuageAccueil({ total }: { total: number }) {
  const mots = await nuagePublic(APERCU);
  if (mots.length === 0) return null;

  // Une courbe douce plutôt qu'une proportion brute : "drame" est porté
  // par cinq fois plus de projets que le suivant et écraserait tout.
  const taille = (poids: number) => Math.round(15 + 19 * Math.pow(poids, 0.6));

  return (
    <div className={styles.bloc}>
      <p className={styles.titre}>Les thèmes les plus portés par les projets</p>

      <p className={styles.nuage} aria-label="Aperçu des mots-clés les plus utilisés">
        {mots.map((m) => (
          <span key={m.label} style={{ fontSize: taille(m.poids) }}>
            {m.label}
          </span>
        ))}
      </p>

      <p className={styles.mention}>
        Ces {mots.length} mots sur les <strong>{total.toLocaleString("fr-FR")}</strong> que
        compte la plateforme. Le nuage complet, les chiffres et la recherche par
        mots-clés sont réservés aux adhérents.{" "}
        <Link href="/adhesion" className={styles.lien}>
          Découvrir l&apos;adhésion
        </Link>
      </p>
    </div>
  );
}
