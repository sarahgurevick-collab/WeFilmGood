import Link from "next/link";
import type { ReactNode } from "react";
import LogoAnime from "./LogoAnime";
import LogoComplet from "./LogoComplet";
import PanneauEngagement from "./PanneauEngagement";
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
  compacte = false,
  logoAnime = false,
  children,
}: {
  active: "connexion" | "inscription";
  /** "clair" pour un fond blanc. */
  theme?: "sombre" | "clair";
  /** true pour une carte blanche posée sur le fond noir. */
  carteClaire?: boolean;
  /** true une fois le formulaire envoyé : basculer d'onglet n'a plus de sens. */
  sansOnglets?: boolean;
  /** true pour une carte à la hauteur de son contenu, sans hauteur fixe. */
  compacte?: boolean;
  /** true pour le logo qui passe d'un engagement à l'autre. */
  logoAnime?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`${styles.page} ${theme === "clair" ? "clair" : ""}`}>
      {/* ESSAI (25/09) : la moitié gauche de l'écran est le panneau rouge de
          l'accueil (logo + « for », couleur de l'horloge). Sur téléphone, il
          n'y a pas la place : la carte seule. */}
      <PanneauEngagement />
      {/* Avec le logo animé (page d'arrivée du lien), l'horloge des
          engagements tourne plus vite sur toute la carte : on clique vite,
          et le bouton suit le logo. */}
      <div
        className={`${styles.card} ${compacte ? styles.compacte : ""} ${logoAnime ? "engagementsRapides" : ""} ${carteClaire ? `clair ${styles.carteClaire}` : ""}`}
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
          {logoAnime ? (
            <LogoAnime hauteur={56} tailleMention={15} centre />
          ) : (
            <LogoComplet hauteur={48} />
          )}
          <span className={styles.tagline}>
            The best stories wherever they are
          </span>
        </Link>

        <div className={styles.contenu}>{children}</div>
      </div>
    </div>
  );
}
