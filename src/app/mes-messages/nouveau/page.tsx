import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { contacterAuteur } from "@/app/projet/[id]/actions";
import { createClient } from "@/lib/supabase/server";

/**
 * Écrire à l'auteur d'un projet — dans l'onglet Messages, et non plus sur
 * la fiche projet (décision de Sarah, 26/09/2026) : la fiche n'a plus
 * qu'un bouton « Contacter l'auteur » qui mène ici, le projet déjà
 * indiqué.
 */
export default async function NouveauMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ projet?: string; message?: string }>;
}) {
  const { projet: projectId, message } = await searchParams;
  if (!projectId) redirect("/mes-messages");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/mes-messages/nouveau?projet=${projectId}`);

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

  const auteur = projet.owner?.first_name ?? projet.owner?.full_name ?? "l'auteur";

  return (
    <PageShell eyebrow="Mes messages" title={`Écrire à ${auteur}`} connecte nav="messages">
      <p className={formStyles.hint}>
        À propos de «{" "}
        <Link href={`/projet/${projet.id}`}>{projet.title}</Link> ». L&apos;auteur est prévenu
        par email et vient lire votre message sur la plateforme.
      </p>

      {message === "vide" && (
        <p className={formStyles.hint} style={{ color: "#b3261e" }}>
          Le message ne peut pas être vide.
        </p>
      )}

      <form action={contacterAuteur} className={formStyles.form} style={{ marginTop: 16 }}>
        <input type="hidden" name="project_id" value={projet.id} />
        <input type="hidden" name="recipient_id" value={projet.owner_id} />
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
