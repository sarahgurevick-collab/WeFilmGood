import Link from "next/link";
import LogoAnime from "./LogoAnime";
import styles from "./BarreNav.module.css";

/**
 * Barre d'onglets fixée en bas sur téléphone, au pouce. Les producteurs
 * consultent la plateforme en festival et dans les transports : c'est
 * leur contexte principal, pas un cas de repli.
 *
 * Sur grand écran elle passe en haut, en simple rangée de liens.
 */
export default function BarreNav({
  actif,
  connecte,
  messagesNonLus = 0,
}: {
  actif?: "pitchotheque" | "deposer" | "messages" | "profil";
  connecte: boolean;
  messagesNonLus?: number;
}) {
  const onglets = [
    { cle: "pitchotheque", href: "/projets", label: "Projets" },
    { cle: "deposer", href: "/deposer", label: "Déposer" },
    ...(connecte ? [{ cle: "messages", href: "/mes-messages", label: "Messages" }] as const : []),
    connecte
      ? { cle: "profil", href: "/profil", label: "Profil" }
      : { cle: "profil", href: "/connexion", label: "Connexion" },
  ] as const;

  return (
    <nav className={styles.barre} aria-label="Navigation principale">
      <Link href="/" className={styles.marque} aria-label="Accueil">
        <LogoAnime hauteur={34} />
      </Link>

      <div className={styles.onglets}>
        {onglets.map((o) => (
          <Link
            key={o.cle}
            href={o.href}
            className={actif === o.cle ? styles.ongletActif : styles.onglet}
          >
            {o.label}
            {o.cle === "messages" && messagesNonLus > 0 && (
              <span className={styles.pastille}>{messagesNonLus}</span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
