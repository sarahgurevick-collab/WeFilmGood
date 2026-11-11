import Link from "next/link";
import formStyles from "@/components/form.module.css";
import { GRAVITY } from "@/lib/gravity-textes";
import { basculerFavori, ouvrirAvecGravity } from "./gravity-actions";
import styles from "./gravity.module.css";

const COEUR = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" />
  </svg>
);

export type EtatGravity =
  | { etat: "ouvert"; le: string }
  | { etat: "disponible" }
  | { etat: "utilise" }
  | { etat: "sans_adhesion" };

/**
 * Sur la fiche d'un projet qui n'est pas le sien (12/11/2026) : le bouton
 * qui dépense le Gravity du jour, ou ce qui l'empêche ; et le cœur des
 * favoris, pour les adhérents. L'auteur, son équipe et l'administration ne
 * voient pas cette barre : pour eux tout est déjà ouvert.
 */
export default function BarreGravity({
  projetId,
  gravity,
  favori,
}: {
  projetId: string;
  gravity: EtatGravity;
  /** null : pas de cœur (sans adhésion). */
  favori: boolean | null;
}) {
  return (
    <div className={styles.barre}>
      {gravity.etat === "disponible" && (
        <>
          <form action={ouvrirAvecGravity}>
            <input type="hidden" name="projet" value={projetId} />
            <button type="submit" className={formStyles.submit}>
              {GRAVITY.bouton}
            </button>
          </form>
          <p className={styles.texte}>{GRAVITY.ceQuiSOuvre}</p>
        </>
      )}
      {gravity.etat === "utilise" && <p className={styles.texte}>{GRAVITY.dejaUtilise}</p>}
      {gravity.etat === "sans_adhesion" && (
        <p className={styles.texte}>
          <Link href="/adhesion">{GRAVITY.sansAdhesion}</Link>
        </p>
      )}
      {gravity.etat === "ouvert" && (
        <p className={styles.texte}>
          {GRAVITY.ouvertLe} {new Date(gravity.le).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })}
        </p>
      )}
      {favori !== null && (
        <>
          <form action={basculerFavori}>
            <input type="hidden" name="projet" value={projetId} />
            <button type="submit" className={`${styles.coeur} ${favori ? styles.coeurPlein : ""}`}>
              {COEUR}
              {favori ? GRAVITY.favoris.retirer : GRAVITY.favoris.ajouter}
            </button>
          </form>
          <Link href="/favoris" className={styles.lien}>
            {GRAVITY.favoris.lien}
          </Link>
        </>
      )}
    </div>
  );
}
