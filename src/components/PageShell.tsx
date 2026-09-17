import type { ReactNode } from "react";
import BarreNav from "./BarreNav";
import EnTeteAnime from "./EnTeteAnime";
import styles from "./PageShell.module.css";

export default function PageShell({
  eyebrow,
  title,
  wide = false,
  theme = "sombre",
  nav,
  connecte = false,
  enTeteAnime = false,
  children,
}: {
  eyebrow?: string;
  title?: string;
  wide?: boolean;
  /** "clair" pour les pages qui se lisent longuement ou qui doivent respirer. */
  theme?: "sombre" | "clair";
  /** Onglet à marquer comme actif dans la barre de navigation. */
  nav?: "pitchotheque" | "deposer" | "messages" | "profil";
  connecte?: boolean;
  /** true pour les pages du menu déroulant : bande blanche animée au lieu de la barre noire. */
  enTeteAnime?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`${styles.page} ${theme === "clair" ? "clair" : ""}`}>
      {enTeteAnime ? (
        <EnTeteAnime connecte={connecte} />
      ) : (
        <BarreNav actif={nav} connecte={connecte} />
      )}
      <main className={`${styles.main} ${wide ? styles.wide : ""}`}>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        {title && <h1 className={styles.title}>{title}</h1>}
        {children}
      </main>
    </div>
  );
}
