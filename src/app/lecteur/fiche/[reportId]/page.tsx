import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { sanitizeFiche } from "@/lib/sanitize";

/**
 * La fiche rendue, relue par son lecteur. Elle est visible dès l'envoi :
 * le lecteur ne sait pas qu'une validation a lieu de l'autre côté.
 */
export default async function FicheRendueDuLecteurPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/lecteur/fiche/${reportId}`);

  const { data: report } = await supabase
    .from("reading_reports")
    .select("content, score, submitted_at, project:projects(title)")
    .eq("id", reportId)
    .eq("reader_id", user.id)
    .maybeSingle<{
      content: string | null;
      score: number | null;
      submitted_at: string;
      project: { title: string } | null;
    }>();
  if (!report) notFound();

  return (
    <PageShell
      eyebrow="Espace lecteur"
      title={report.project?.title ?? "Ma fiche de lecture"}
      nav="lectures"
      theme="clair"
    >
      <p className={formStyles.hint}>
        Rendue le {new Date(report.submitted_at).toLocaleDateString("fr-FR")} · Note :{" "}
        {report.score ?? "—"} / 200
      </p>
      <div dangerouslySetInnerHTML={{ __html: sanitizeFiche(report.content ?? "") }} />
      <p className={formStyles.linkRow} style={{ marginTop: 32 }}>
        <Link href="/lecteur/mes-fiches">Retour à mes fiches</Link>
      </p>
    </PageShell>
  );
}
