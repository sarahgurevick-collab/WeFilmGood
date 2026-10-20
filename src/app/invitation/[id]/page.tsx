import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { repondre } from "./actions";

/**
 * L'invitation reçue par email (20/10/2026, Sarah) : un auteur invite un
 * talent sur son projet. Le talent accepte ou refuse. Après « Accepter », il
 * arrive sur son profil, à compléter.
 */
export default async function InvitationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(`/invitation/${id}`)}`);

  const { data } = await supabase.rpc("mon_invitation", { p_id: id });
  const inv = (data as { project_id: string; titre: string; porteur: string; metier: string | null; statut: string }[] | null)?.[0];
  if (!inv) notFound();
  if (inv.statut === "accepte") redirect(`/projet/${inv.project_id}`);

  return (
    <PageShell eyebrow="WeFilmGood" title="Invitation" connecte>
      {inv.statut === "refuse" ? (
        <p className={formStyles.hint}>Vous avez refusé cette invitation.</p>
      ) : (
        <>
          <p>
            {inv.porteur} vous invite à rejoindre le projet « {inv.titre} »
            {inv.metier ? ` en tant que ${inv.metier.charAt(0).toLowerCase()}${inv.metier.slice(1)}` : ""}.
          </p>
          <form action={repondre} style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" name="reponse" value="accepter" className={formStyles.submit}>
              Accepter
            </button>
            <button type="submit" name="reponse" value="refuser" className={formStyles.submit} style={{ background: "transparent", border: "1px solid currentColor" }}>
              Refuser
            </button>
          </form>
        </>
      )}
    </PageShell>
  );
}
