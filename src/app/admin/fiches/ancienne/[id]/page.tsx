import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import adminStyles from "../../../admin.module.css";
import NavAdmin from "../../../NavAdmin";

/**
 * Une fiche de lecture reprise de WFG 1, telle que le lecteur l'a rendue.
 *
 * Lecture seule : jusqu'à la bascule, les fiches en attente se relisent et
 * se valident sur l'ancien site, et la dernière copie rapportera leur état.
 */
export default async function FicheAnciennePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const admin = createAdminClient();
  if (!admin) redirect("/admin/fiches-a-valider");

  const { data: fiche } = await admin
    .from("legacy_reading_reports")
    .select(
      "legacy_review_id, content, final_mark, read_at, statut, reader_legacy_id, project:projects(id, title)",
    )
    .eq("legacy_review_id", Number(id))
    .maybeSingle<{
      legacy_review_id: number;
      content: string | null;
      final_mark: number | null;
      read_at: string | null;
      statut: number;
      reader_legacy_id: number | null;
      project: { id: string; title: string } | null;
    }>();

  if (!fiche) redirect("/admin/fiches-a-valider");

  const { data: lecteur } = fiche.reader_legacy_id
    ? await admin
        .from("legacy_profiles")
        .select("full_name")
        .eq("legacy_user_id", fiche.reader_legacy_id)
        .maybeSingle()
    : { data: null };

  const aRelire = fiche.statut === 1;

  return (
    <PageShell
      avantTitre={<NavAdmin />}
      eyebrow="Fiche de lecture"
      title={fiche.project?.title ?? "Projet supprimé"}
      theme="clair"
    >
      <p className={formStyles.hint}>
        Rendue par {lecteur?.full_name ?? "—"} le{" "}
        {fiche.read_at
          ? new Date(fiche.read_at).toLocaleDateString("fr-FR")
          : "—"}{" "}
        · note du lecteur {fiche.final_mark ?? "—"} / 200
        {fiche.project && (
          <>
            {" · "}
            <Link href={`/projet/${fiche.project.id}`}>
              voir la fiche projet
            </Link>
          </>
        )}
      </p>

      {aRelire && (
        <p className={adminStyles.motivation}>
          <strong>Fiche de l&apos;ancien site, pas encore validée</strong>
          Elle se relit et se valide sur WFG 1 jusqu&apos;à la bascule.
          L&apos;auteur ne la voit pas.
        </p>
      )}

      <div className={formStyles.field} style={{ marginTop: 32 }}>
        <span>Texte rendu par le lecteur</span>
        <div className={adminStyles.ficheTexte}>
          {fiche.content?.trim() || "Fiche vide."}
        </div>
      </div>

      <p className={formStyles.linkRow} style={{ marginTop: 32 }}>
        <Link href="/admin/fiches-a-valider">Retour aux fiches à valider</Link>
      </p>
    </PageShell>
  );
}
