import type { ReactNode } from "react";
import { incarnationEnCours } from "@/app/admin/profils/prise-de-place";
import { createClient } from "@/lib/supabase/server";
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
  connecte,
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
  nav?: "pitchotheque" | "deposer" | "messages" | "profil" | "admin";
  connecte?: boolean;
  /** true pour les pages du menu déroulant : bande blanche animée au lieu de la barre noire. */
  enTeteAnime?: boolean;
  children: ReactNode;
}) {
  const incarne = await incarnationEnCours();
  // Si la page ne le dit pas, on regarde nous-mêmes : une trentaine de
  // pages oubliaient de le passer, et la barre montrait « Connexion » à
  // une membre connectée (26/09).
  let estConnecte = connecte;
  if (estConnecte === undefined) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    estConnecte = Boolean(user);
  }

  return (
    <div className={`${styles.page} ${theme === "clair" ? "clair" : ""} ${incarne ? styles.incarnee : ""}`}>
      {incarne && <BandeauIncarnation />}
      {enTeteAnime ? (
        <EnTeteAnime connecte={estConnecte} />
      ) : (
        <BarreNav actif={nav} connecte={estConnecte} />
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
