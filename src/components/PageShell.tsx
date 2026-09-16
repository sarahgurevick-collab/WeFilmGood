import type { ReactNode } from "react";
import BarreNav from "./BarreNav";
import styles from "./PageShell.module.css";

export default function PageShell({
  eyebrow,
  title,
  wide = false,
  theme = "sombre",
  nav,
  connecte = false,
  children,
}: {
  eyebrow: string;
  title: string;
  wide?: boolean;
  /** "clair" pour les pages qui se lisent longuement ou qui doivent respirer. */
  theme?: "sombre" | "clair";
  /** Onglet à marquer comme actif dans la barre de navigation. */
  nav?: "pitchotheque" | "deposer" | "messages" | "profil";
  connecte?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`${styles.page} ${theme === "clair" ? "clair" : ""}`}>
      <BarreNav actif={nav} connecte={connecte} />
      <main className={`${styles.main} ${wide ? styles.wide : ""}`}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        {children}
      </main>
    </div>
  );
}
