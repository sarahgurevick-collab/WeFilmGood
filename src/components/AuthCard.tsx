import Link from "next/link";
import type { ReactNode } from "react";
import LogoComplet from "./LogoComplet";
import styles from "./AuthCard.module.css";

/**
 * Carte d'authentification commune à la connexion et à l'inscription.
 * Les deux onglets sont des liens : la bascule fonctionne sans JavaScript
 * et chaque écran garde son URL propre.
 */
export default function AuthCard({
  active,
  theme = "sombre",
  carteClaire = false,
  sansOnglets = false,
  children,
}: {
  active: "connexion" | "inscription";
  /** "clair" pour un fond blanc. */
  theme?: "sombre" | "clair";
  /** true pour une carte blanche posée sur le fond noir. */
  carteClaire?: boolean;
  /** true une fois le formulaire envoyé : basculer d'onglet n'a plus de sens. */
  sansOnglets?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`${styles.page} ${theme === "clair" ? "clair" : ""}`}>
      <div
        className={`${styles.card} ${carteClaire ? `clair ${styles.carteClaire}` : ""}`}
      >
        {!sansOnglets && (
          <nav className={styles.tabs}>
            <Link
              href="/connexion"
              className={active === "connexion" ? styles.tabActive : styles.tab}
            >
              Se connecter
            </Link>
            <Link
              href="/inscription"
              className={
                active === "inscription" ? styles.tabActive : styles.tab
              }
            >
              Créer un profil
            </Link>
          </nav>
        )}

        <Link href="/" className={styles.brand}>
          <LogoComplet hauteur={48} />
          <span className={styles.tagline}>
            The best stories wherever they are
          </span>
        </Link>

        <div className={styles.contenu}>{children}</div>
      </div>
    </div>
  );
}
