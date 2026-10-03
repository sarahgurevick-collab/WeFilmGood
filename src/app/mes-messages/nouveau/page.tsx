import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { ecrire } from "../actions";
import { createClient } from "@/lib/supabase/server";

/**
 * Écrire à l'auteur d'un projet (?projet=…) ou à un talent depuis son
 * profil (?membre=…) — dans l'onglet Messages, et non plus sur la fiche
 * projet (décision de Sarah, 26/09/2026) : la fiche n'a plus qu'une
 * enveloppe qui mène ici, le projet déjà indiqué (03/10).
 */
export default async function NouveauMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ projet?: string; membre?: string; message?: string }>;
}) {
  const { projet: projectId, membre: membreId, message } = await searchParams;
  if (!projectId && !membreId) redirect("/mes-messages");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/connexion?next=${encodeURIComponent(
        projectId ? `/mes-messages/nouveau?projet=${projectId}` : `/mes-messages/nouveau?membre=${membreId}`,
      )}`,
    );
  }

  // Écrire demande une adhésion (02/10) ; l'administration passe.
  const [{ data: adherent }, { data: estAdmin }] = await Promise.all([
    supabase.rpc("a_une_adhesion_active", { p_profile_id: user.id }),
    supabase.rpc("is_admin"),
  ]);

  let titre: string;
  let apropos: { id: string; title: string } | null = null;
  let destinataire: string;

  if (projectId) {
    const { data: projet } = await supabase
      .from("projects")
      .select("id, title, owner_id, owner:profiles!projects_owner_id_fkey(first_name, full_name)")
      .eq("id", projectId)
      .maybeSingle<{
        id: string;
        title: string;
        owner_id: string;
        owner: { first_name: string | null; full_name: string | null } | null;
      }>();
    if (!projet) notFound();
    // Son propre projet : rien à s'écrire.
    if (projet.owner_id === user.id) redirect(`/projet/${projet.id}`);
    if (adherent !== true && estAdmin !== true) redirect("/adhesion");

    destinataire = projet.owner_id;
    apropos = { id: projet.id, title: projet.title };
    titre = `Écrire à ${projet.owner?.first_name ?? projet.owner?.full_name ?? "l'auteur"}`;
  } else {
    const { data: membre } = await supabase
      .from("profiles")
      .select("id, first_name, display_name, full_name")
      .eq("id", membreId as string)
      .maybeSingle<{ id: string; first_name: string | null; display_name: string | null; full_name: string | null }>();
    // Un lecteur est introuvable : on ne lui écrit pas.
    const { data: lecteur } = membre
      ? await supabase
          .from("profile_roles")
          .select("role_slug")
          .eq("profile_id", membre.id)
          .eq("role_slug", "lecteur")
          .maybeSingle()
      : { data: null };
    if (!membre || lecteur) notFound();
    if (membre.id === user.id) redirect("/mes-messages");
    if (adherent !== true && estAdmin !== true) redirect("/adhesion");

    destinataire = membre.id;
    titre = `Écrire à ${membre.first_name ?? membre.display_name ?? membre.full_name ?? "ce membre"}`;
  }

  return (
    <PageShell eyebrow="Mes messages" title={titre} connecte nav="messages">
      {apropos && (
        <p className={formStyles.hint}>
          À propos de «{" "}
          <Link href={`/projet/${apropos.id}`}>{apropos.title}</Link> ». L&apos;auteur est prévenu
          par email et vient lire votre message sur la plateforme.
        </p>
      )}

      {message === "vide" && (
        <p className={formStyles.hint} style={{ color: "#b3261e" }}>
          Le message ne peut pas être vide.
        </p>
      )}

      <form action={ecrire} className={formStyles.form} style={{ marginTop: 16 }}>
        <input type="hidden" name="project_id" value={apropos?.id ?? ""} />
        <input type="hidden" name="recipient_id" value={destinataire} />
        <input type="hidden" name="retour" value={apropos ? "projet" : "membre"} />
        <label className={formStyles.field}>
          <span>Votre message</span>
          <textarea name="body" rows={6} required autoFocus />
        </label>
        <button type="submit" className={formStyles.submit}>
          Envoyer
        </button>
      </form>
    </PageShell>
  );
}
