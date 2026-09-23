import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import NavAdmin from "../../NavAdmin";
import formStyles from "@/components/form.module.css";
import adminStyles from "../../admin.module.css";
import RichTextEditor from "@/components/RichTextEditor";
import { sanitizeFiche } from "@/lib/sanitize";
import { createClient } from "@/lib/supabase/server";
import { publishReport } from "./actions";

type Report = {
  id: string;
  content: string | null;
  score: number | null;
  label_motivation: string | null;
  status: string;
  submitted_at: string;
  project: { id: string; title: string } | null;
  reader: { full_name: string | null } | null;
};

export default async function FicheAdminPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    redirect("/");
  }

  const { data: report } = await supabase
    .from("reading_reports")
    .select(
      "id, content, score, label_motivation, status, submitted_at, project:projects(id, title), reader:profiles(full_name)",
    )
    .eq("id", reportId)
    .maybeSingle<Report>();

  if (!report) {
    redirect("/admin/fiches-a-valider");
  }

  // Si la fiche a déjà été publiée, c'est cette version qu'on retravaille.
  const { data: publication } = await supabase
    .from("reading_report_publications")
    .select("content, score, published_at")
    .eq("reading_report_id", reportId)
    .maybeSingle();

  // Passé par le filtre avant d'entrer dans l'éditeur : c'est là que
  // l'ancienne mise en forme est traduite, sans quoi l'éditeur la
  // supprimerait en silence.
  const content = sanitizeFiche(publication?.content ?? report.content ?? "");
  const score = publication?.score ?? report.score ?? 0;

  return (
    <PageShell
      avantTitre={<NavAdmin />}
      eyebrow="Fiche de lecture"
      title={report.project?.title ?? "Projet"}
      theme="clair"
    >
      <p className={formStyles.hint}>
        Rendue par {report.reader?.full_name ?? "—"} le{" "}
        {new Date(report.submitted_at).toLocaleDateString("fr-FR")} · note du
        lecteur {report.score ?? "—"} / 200
        {publication &&
          ` · publiée le ${new Date(publication.published_at).toLocaleDateString("fr-FR")}`}
      </p>

      {report.label_motivation && (
        <div className={adminStyles.motivation}>
          <strong>Pourquoi le lecteur labellise ce projet</strong>
          <p>{report.label_motivation}</p>
        </div>
      )}

      <p className={formStyles.hint} style={{ marginTop: 16 }}>
        Vos corrections ne sont pas visibles par le lecteur : il voit sa version
        et le fait que le projet a été validé, rien d&apos;autre.
      </p>

      <form
        className={formStyles.form}
        action={publishReport}
        style={{ marginTop: 32 }}
      >
        <input type="hidden" name="report_id" value={report.id} />

        <div className={formStyles.field}>
          <span>Texte publié à l&apos;auteur</span>
          <RichTextEditor name="content" defaultValue={content} />
        </div>

        <label className={formStyles.field}>
          <span>Note publiée (au-delà de 150, le projet est labellisé)</span>
          <input
            type="number"
            name="score"
            min={0}
            max={200}
            defaultValue={score}
            required
          />
        </label>

        <button type="submit" className={formStyles.submit}>
          {publication ? "Republier" : "Valider et publier"}
        </button>
      </form>

      <p className={formStyles.linkRow} style={{ marginTop: 32 }}>
        <Link href="/admin/fiches-a-valider">
          Retour aux fiches à valider
        </Link>
      </p>
    </PageShell>
  );
}
