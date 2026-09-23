import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import SalleVisio, { type RoleVisio } from "@/components/SalleVisio";
import { QuestionsPublic, QuestionsRegie } from "@/components/QuestionsAtelier";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHAMPS_ATELIER, dateAtelier, phaseAtelier, type Atelier } from "@/lib/ateliers";
import { jetonVisio } from "@/lib/visio";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

/**
 * La page d'un atelier. Trois façons d'y entrer :
 * - un intervenant, avec la clé de son lien personnel (sans compte) ;
 * - l'administratrice, qui y trouve la régie (visio + questions à trier) ;
 * - un membre connecté, qui regarde et pose ses questions par écrit.
 * Avant l'heure, on annonce la date ; après, on montre la rediffusion.
 */
export default async function AtelierPage({
  params,
  searchParams,
}: {
  params: Promise<{ salle: string }>;
  searchParams: Promise<{ cle?: string }>;
}) {
  const { salle } = await params;
  const { cle } = await searchParams;
  if (!/^[a-z0-9-]{3,60}$/.test(salle)) notFound();

  // Un intervenant n'a pas forcément de compte : on vérifie sa clé côté serveur.
  let intervenant: { nom: string; email: string } | null = null;
  let atelier: Atelier | null = null;
  if (cle && /^[a-f0-9]{36}$/.test(cle)) {
    const admin = createAdminClient();
    const { data } = admin
      ? await admin
          .from("atelier_intervenants")
          .select(`nom, email, atelier:ateliers!inner(${CHAMPS_ATELIER})`)
          .eq("cle", cle)
          .eq("atelier.salle", salle)
          .maybeSingle<{ nom: string; email: string; atelier: Atelier }>()
      : { data: null };
    if (data) {
      intervenant = { nom: data.nom, email: data.email };
      atelier = data.atelier;
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!intervenant) {
    if (!user) redirect(`/connexion?next=/ateliers/${salle}`);
    const { data } = await supabase
      .from("ateliers")
      .select(CHAMPS_ATELIER)
      .eq("salle", salle)
      .maybeSingle<Atelier>();
    atelier = data;
  }
  if (!atelier) notFound();

  const { data: isAdmin } = user ? await supabase.rpc("is_admin") : { data: false };
  const role: RoleVisio = intervenant ? "intervenant" : isAdmin ? "regie" : "public";
  const phase = phaseAtelier(atelier);

  // Qui entre dans la salle maintenant ? Le public seulement quand elle est
  // ouverte ; les intervenants dès qu'ils veulent (pour tester leur micro) ;
  // la régie tout le temps.
  const salleOuverte =
    role === "regie" || (role === "intervenant" && phase !== "termine") || phase === "ouvert";

  let nom = intervenant?.nom ?? "Membre WeFilmGood";
  if (user && !intervenant) {
    const { data: profil } = await supabase
      .from("profiles")
      .select("first_name, last_name, full_name")
      .eq("id", user.id)
      .maybeSingle();
    nom =
      [profil?.first_name, profil?.last_name].filter(Boolean).join(" ") ||
      profil?.full_name ||
      nom;
  }

  if (salleOuverte && role === "public" && user) {
    await supabase
      .from("atelier_presences")
      .upsert({ atelier_id: atelier.id, profile_id: user.id }, { ignoreDuplicates: true });
  }

  const jwt = salleOuverte
    ? jetonVisio({
        salle,
        nom: role === "regie" ? `${nom} (WeFilmGood)` : nom,
        email: intervenant?.email ?? user?.email,
        moderateur: role !== "public",
      })
    : null;

  const lienVideo = `/ateliers/${salle}/video${intervenant && cle ? `?cle=${cle}` : ""}`;

  return (
    <PageShell
      eyebrow={role === "regie" ? "Régie de l'atelier" : "Atelier WeFilmGood"}
      title={atelier.titre}
      enTeteAnime
      connecte={!!user}
    >
      <p className={styles.date}>{dateAtelier(atelier.debut)}</p>
      {atelier.description && <p className={styles.intro}>{atelier.description}</p>}

      {role === "regie" && (
        <p className={styles.aide}>
          <Link href={`/admin/ateliers/${atelier.id}`}>← Fiche de l&apos;atelier</Link> · Vous êtes
          en régie : le public ne vous voit que si vous ouvrez votre caméra. Les questions arrivent
          à droite ; cliquez « Relayée » après les avoir posées aux intervenants.
        </p>
      )}
      {role === "intervenant" && (
        <p className={styles.aide}>
          Bienvenue {intervenant?.nom}. Autorisez le micro et la caméra quand votre navigateur le
          demande. Le public vous voit et vous entend ; ses questions vous seront relayées à
          l&apos;oral par l&apos;équipe de WeFilmGood.
        </p>
      )}

      {jwt ? (
        <div className={role === "intervenant" ? styles.seul : styles.grille}>
          <SalleVisio salle={salle} jwt={jwt} role={role} titre={atelier.titre} />
          {role === "regie" && <QuestionsRegie salle={salle} />}
          {role === "public" && <QuestionsPublic salle={salle} />}
        </div>
      ) : phase === "a-venir" ? (
        <div className={styles.attente}>
          <p>La salle ouvrira 30 minutes avant le début.</p>
          <p className={styles.aide}>
            Revenez sur cette page le jour venu : pas besoin de logiciel, votre navigateur suffit.
          </p>
        </div>
      ) : atelier.rediffusion_fichier ? (
        <div className={styles.rediffusion}>
          <h2 className={styles.sousTitre}>La rediffusion</h2>
          <video controls preload="metadata" className={styles.video} src={lienVideo} />
        </div>
      ) : (
        <div className={styles.attente}>
          <p>Cet atelier est terminé.</p>
          <p className={styles.aide}>La rediffusion sera bientôt disponible ici.</p>
        </div>
      )}

      {role === "regie" && atelier.rediffusion_fichier && (
        <div className={styles.rediffusion}>
          <h2 className={styles.sousTitre}>Rediffusion choisie</h2>
          <video controls preload="metadata" className={styles.video} src={lienVideo} />
        </div>
      )}
    </PageShell>
  );
}
