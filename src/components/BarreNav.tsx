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
  actif?: "pitchotheque" | "deposer" | "messages" | "profil" | "admin";
  connecte: boolean;
}) {
  // Le nombre de messages en attente, même pour un membre sans adhésion :
  // il ne peut pas les ouvrir, mais il doit voir qu'ils l'attendent.
  let messagesNonLus = 0;
  let estAdmin = false;
  if (connecte) {
    const supabase = await createClient();
    const [{ data }, { data: admin }] = await Promise.all([
      supabase.rpc("compter_messages_non_lus"),
      supabase.rpc("is_admin"),
    ]);
    messagesNonLus = typeof data === "number" ? data : 0;
    estAdmin = admin === true;
  }
  const onglets = [
    { cle: "pitchotheque", href: "/pitchotheque", label: "Pitchothèque" },
    // La liste de ses fiches (ou la création s'il n'en a aucune). Un
    // visiteur non connecté n'a rien à y faire : pas d'onglet (26/09).
    ...(connecte ? [{ cle: "deposer", href: "/mes-projets", label: "Mes projets" }] as const : []),
    ...(connecte ? [{ cle: "messages", href: "/mes-messages", label: "Messages" }] as const : []),
    connecte
      ? { cle: "profil", href: "/profil", label: "Profil" }
      : { cle: "profil", href: "/connexion", label: "Connexion" },
    // L'administration, pour qui en a le droit (26/09) : jusqu'ici, seul
    // le lien de la page Menu y menait.
    ...(estAdmin ? [{ cle: "admin", href: "/admin", label: "Administration" }] as const : []),
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
