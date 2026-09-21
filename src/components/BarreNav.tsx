import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoAnime from "./LogoAnime";
import styles from "./BarreNav.module.css";

/**
 * Barre d'onglets fixée en bas sur téléphone, au pouce. Les producteurs
 * consultent la plateforme en festival et dans les transports : c'est
 * leur contexte principal, pas un cas de repli.
 *
 * Sur grand écran elle passe en haut, en simple rangée de liens.
 */
export default async function BarreNav({
  actif,
  connecte,
}: {
  actif?: "pitchotheque" | "deposer" | "messages" | "profil";
  connecte: boolean;
}) {
  // Le nombre de messages en attente, même pour un membre sans adhésion :
  // il ne peut pas les ouvrir, mais il doit voir qu'ils l'attendent.
  let messagesNonLus = 0;
  if (connecte) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("compter_messages_non_lus");
    messagesNonLus = typeof data === "number" ? data : 0;
  }
  const onglets = [
    { cle: "pitchotheque", href: "/projets", label: "Pitchothèque" },
    { cle: "deposer", href: "/deposer", label: "Fiche projet" },
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
            className={[
              actif === o.cle ? styles.ongletActif : styles.onglet,
              o.cle === "messages" && messagesNonLus > 0 ? styles.clignote : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {o.label}
            {o.cle === "messages" && messagesNonLus > 0 && (
              <span className={styles.pastille}>
                {messagesNonLus}
                <span className={styles.lecteurEcran}>
                  {" "}
                  message{messagesNonLus > 1 ? "s" : ""} non lu
                  {messagesNonLus > 1 ? "s" : ""}
                </span>
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
