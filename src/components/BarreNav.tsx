import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LogoAnime from "./LogoAnime";
import styles from "./BarreNav.module.css";
import { EMPLACEMENT_ENTETE } from "./useEmplacementEntete";
import MenuBarre from "./MenuBarre";

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
  actif?: "pitchotheque" | "deposer" | "favoris" | "messages" | "profil" | "lectures" | "admin";
  connecte: boolean;
}) {
  // Le nombre de messages en attente, même pour un membre sans adhésion :
  // il ne peut pas les ouvrir, mais il doit voir qu'ils l'attendent.
  let messagesNonLus = 0;
  // Les projets dont le match vient de changer, pas encore vu (23/11).
  let matchsNouveaux = 0;
  let estAdmin = false;
  let estLecteur = false;
  // « Mes favoris » (12/11, Sarah) : pour les adhérents, et pour qui a déjà
  // ouvert un projet (il doit pouvoir le retrouver même sans adhésion).
  let aDesFavoris = false;
  // Les soleils qui restent (16/11, Sarah : « mentionner ses crédits restants
  // sur la barre en haut de page ») : le soleil du jour s'il n'est pas
  // dépensé, plus ceux du Pack Soleils. null : rien à montrer.
  let soleils: { jour: boolean; pack: number } | null = null;
  if (connecte) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const [{ data }, { data: admin }, { data: roleLecteur }, { data: adherent }, { count: ouverts }] = await Promise.all([
      supabase.rpc("compter_messages_non_lus"),
      supabase.rpc("is_admin"),
      supabase
        .from("profile_roles")
        .select("role_slug")
        .eq("profile_id", user?.id ?? "")
        .eq("role_slug", "lecteur")
        .maybeSingle(),
      supabase.rpc("a_une_adhesion_active", { p_profile_id: user?.id ?? "00000000-0000-0000-0000-000000000000" }),
      supabase
        .from("gravity_ouvertures")
        .select("project_id", { count: "exact", head: true })
        .eq("profile_id", user?.id ?? "00000000-0000-0000-0000-000000000000"),
    ]);
    aDesFavoris = adherent === true || (ouverts ?? 0) > 0;
    const [{ data: jour }, { data: pack }] = await Promise.all([
      adherent === true ? supabase.rpc("gravity_du_jour_disponible") : Promise.resolve({ data: false }),
      supabase.rpc("soleils_pack_restants"),
    ]);
    const restePack = typeof pack === "number" ? pack : 0;
    if (adherent === true || restePack > 0) soleils = { jour: jour === true, pack: restePack };
    messagesNonLus = typeof data === "number" ? data : 0;
    const { data: matchs } = await supabase.rpc("mes_matchs_nouveaux");
    matchsNouveaux = typeof matchs === "number" ? matchs : 0;
    estAdmin = admin === true;
    // Un lecteur n'a pas accès à la plateforme : sa barre n'a que ses deux pages.
    estLecteur = !!roleLecteur && !estAdmin;
  }
  const onglets = estLecteur
    ? ([
        { cle: "lectures", href: "/lecteur", label: "Mes lectures" },
        { cle: "profil", href: "/lecteur/profil", label: "Mon profil" },
      ] as const)
    : [
    { cle: "pitchotheque", href: "/galaxies", label: "Galaxies" },
    // La liste de ses fiches (ou la création s'il n'en a aucune). Un
    // visiteur non connecté n'a rien à y faire : pas d'onglet (26/09).
    ...(connecte ? [{ cle: "deposer", href: "/mes-projets", label: "Mes projets" }] as const : []),
    ...(aDesFavoris ? [{ cle: "favoris", href: "/favoris", label: "Mes favoris" }] as const : []),
    ...(connecte ? [{ cle: "messages", href: "/mes-messages", label: "Mes messages" }] as const : []),
    connecte
      ? { cle: "profil", href: "/profil", label: "Mon profil" }
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
            {/* « Galaxies », « Mes projets », « Mes messages », « Mon profil »
                (02/10). Le logo complet suit « Galaxies » et change de
                couleur avec celui du haut (01/10). */}
            {o.label}
            {o.cle === "pitchotheque" && (
              <>
                {" "}
                <span className={styles.logoOnglet} role="img" aria-label="WeFilmGood" />
              </>
            )}
            {o.cle === "deposer" && matchsNouveaux > 0 && (
              <span className={styles.pastille}>
                {matchsNouveaux}
                <span className={styles.lecteurEcran}>
                  {" "}
                  nouveau{matchsNouveaux > 1 ? "x" : ""} match{matchsNouveaux > 1 ? "s" : ""}
                </span>
              </span>
            )}
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
        {/* Le Menu, au bout des onglets (24/11). Un lecteur n'a que ses deux pages. */}
        {!estLecteur && <MenuBarre />}
      </div>

      {soleils && !estLecteur && (
        <Link
          href="/favoris"
          className={styles.soleils}
          title={`${soleils.jour ? "Soleil du jour disponible" : "Soleil du jour utilisé"} · Pack : ${soleils.pack} soleil${soleils.pack > 1 ? "s" : ""}`}
        >
          <span className={styles.soleilIcone} aria-hidden="true">☀</span>
          {(soleils.jour ? 1 : 0) + soleils.pack}
          <span className={styles.lecteurEcran}>
            {" "}
            soleil{(soleils.jour ? 1 : 0) + soleils.pack > 1 ? "s" : ""} restant
            {(soleils.jour ? 1 : 0) + soleils.pack > 1 ? "s" : ""}
          </span>
        </Link>
      )}

      {/* « Bienvenue Prénom » quitte la barre (15/11, Sarah : coupé sous Mira) :
          il devient le titre de « Mon profil ». Retour : étiquette bienvenue-avant-profil. */}

      {/* Mira et la traduction, au bout de la barre (sur ordinateur) pour les
          membres connectés : ils viennent s'y ranger (Assistant.tsx,
          Traduction.tsx). Sur téléphone la barre est en bas : ils restent
          en bas à droite. */}
      {connecte && <div {...{ [EMPLACEMENT_ENTETE]: "" }} className={styles.outils} />}
    </nav>
  );
}
