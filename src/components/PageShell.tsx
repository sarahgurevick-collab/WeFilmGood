import type { ReactNode } from "react";
import { incarnationEnCours } from "@/app/admin/profils/prise-de-place";
import BandeauIncarnation from "./BandeauIncarnation";
import BarreNav from "./BarreNav";
import EnTeteAnime from "./EnTeteAnime";
import styles from "./PageShell.module.css";

export default async function PageShell({
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
  const incarne = await incarnationEnCours();

  return (
    <div className={`${styles.page} ${theme === "clair" ? "clair" : ""}`}>
      {incarne && <BandeauIncarnation />}
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
