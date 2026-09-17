import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "./Logo";
import styles from "./AuthCard.module.css";

/**
 * Carte d'authentification commune à la connexion et à l'inscription.
 * Les deux onglets sont des liens : la bascule fonctionne sans JavaScript
 * et chaque écran garde son URL propre.
 */
export default function AuthCard({
  active,
  theme = "sombre",
  children,
}: {
  active: "connexion" | "inscription";
  /** "clair" pour un fond blanc. */
  theme?: "sombre" | "clair";
  children: ReactNode;
}) {
  return (
    <div className={`${styles.page} ${theme === "clair" ? "clair" : ""}`}>
      <div className={styles.card}>
        <Link href="/" className={styles.brand}>
          <Logo />
          <span className={styles.mark}>
            We<span className={styles.markAccent}>Film</span>Good
          </span>
          <span className={styles.tagline}>The best stories wherever they are</span>
        </Link>

        <nav className={styles.tabs}>
          <Link
            href="/connexion"
            className={active === "connexion" ? styles.tabActive : styles.tab}
          >
            Se connecter
          </Link>
          <Link
            href="/inscription"
            className={active === "inscription" ? styles.tabActive : styles.tab}
          >
            Créer un profil
          </Link>
        </nav>

        {children}
      </div>
    </div>
  );
}
