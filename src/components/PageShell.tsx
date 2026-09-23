import type { ReactNode } from "react";
import { incarnationEnCours } from "@/app/admin/profils/prise-de-place";
import BandeauIncarnation from "./BandeauIncarnation";
import BarreNav from "./BarreNav";
import EnTeteAnime from "./EnTeteAnime";
import styles from "./PageShell.module.css";

export default async function PageShell({
  avantTitre,
  eyebrow,
  title,
  apresTitre,
  theme = "sombre",
  nav,
  connecte = false,
  enTeteAnime = false,
  children,
}: {
  /** Posé tout en haut du contenu, avant le titre (ex. la barre d'administration). */
  avantTitre?: ReactNode;
  eyebrow?: string;
  title?: string;
  /** Posé juste après le titre, dans la même ligne (ex. le label d'un projet). */
  apresTitre?: ReactNode;
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
      <main className={styles.main}>
        {avantTitre}
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        {title && (
          <h1 className={styles.title}>
            {title}
            {apresTitre}
          </h1>
        )}
        {children}
      </main>
    </div>
  );
}
