import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import styles from "../lecteur.module.css";
import { createClient } from "@/lib/supabase/server";
import RichTextEditor from "@/components/RichTextEditor";
import { submitReadingReport } from "./actions";
import ScoreSlider from "./ScoreSlider";

type Assignment = {
  id: string;
  status: string;
  project: { id: string; title: string; format: string | null; language: string | null } | null;
};

export default async function RedactionFichePage({
  params,
  searchParams,
}: {
  params: Promise<{ assignmentId: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { assignmentId } = await params;
  const { erreur } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/connexion?next=/lecteur/${assignmentId}`);
  }

  const { data: assignment } = await supabase
    .from("reading_assignments")
    .select("id, status, project:projects(id, title, format, language)")
    .eq("id", assignmentId)
    .eq("reader_id", user.id)
    .maybeSingle<Assignment>();

  if (!assignment || !assignment.project) {
    redirect("/lecteur");
  }

  const { data: existing } = await supabase
    .from("reading_reports")
    .select("id")
    .eq("assignment_id", assignmentId)
    .maybeSingle();

  if (existing) {
    redirect("/lecteur/mes-fiches");
  }

  const { data: files } = await supabase
    .from("project_files")
    .select("storage_path, original_name")
    .eq("project_id", assignment.project.id)
    .eq("kind", "scenario");

  const scenario = files?.[0];
  let pdfUrl: string | null = null;
  if (scenario) {
    const { data: signed } = await supabase.storage
      .from("scenarios")
      .createSignedUrl(scenario.storage_path, 60 * 60);
    pdfUrl = signed?.signedUrl ?? null;
  }

  return (
    <PageShell eyebrow="Fiche de lecture" title={assignment.project.title} theme="clair">
      <p className={formStyles.hint}>
        {[assignment.project.format, assignment.project.language].filter(Boolean).join(" · ")}
      </p>

      {pdfUrl ? (
        <p style={{ marginTop: 20 }}>
          <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className={styles.linkButton}>
            Ouvrir le document PDF
          </a>
        </p>
      ) : (
        <p className={formStyles.hint}>Aucun document PDF n&apos;est rattaché à ce projet.</p>
      )}

      <form className={formStyles.form} action={submitReadingReport} style={{ marginTop: 32 }}>
        <input type="hidden" name="assignment_id" value={assignment.id} />
        <input type="hidden" name="project_id" value={assignment.project.id} />
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <div className={formStyles.field}>
          <span>Analyse du projet</span>
          <RichTextEditor name="content" />
          <span className={formStyles.hint}>
            Vous pouvez rédiger sous Word et coller ici : la mise en forme
            est conservée.
          </span>
        </div>

        <ScoreSlider />

        <p className={formStyles.hint}>
          Au-delà de 150, la fiche labellise le projet. Elle devra ensuite être
          validée définitivement par un administrateur.
        </p>

        <button type="submit" className={formStyles.submit}>
          Soumettre la fiche
        </button>
      </form>
    </PageShell>
  );
}
