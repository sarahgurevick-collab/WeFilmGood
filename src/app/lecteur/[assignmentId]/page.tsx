import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import styles from "../lecteur.module.css";
import { createClient } from "@/lib/supabase/server";
import EditeurFiche from "./EditeurFiche";
import { sanitizeFiche } from "@/lib/sanitize";
import { submitReadingReport } from "./actions";
import ScoreSlider from "./ScoreSlider";

type Assignment = {
  id: string;
  status: string;
  draft_content: string | null;
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
    .select("id, status, draft_content, project:projects(id, title, format, language)")
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
  let lireUrl: string | null = null;
  let telechargerUrl: string | null = null;

  if (scenario) {
    // Deux liens signés : l'un s'ouvre dans le navigateur, l'autre force
    // l'enregistrement du fichier.
    const [lecture, telechargement] = await Promise.all([
      supabase.storage.from("scenarios").createSignedUrl(scenario.storage_path, 60 * 60),
      supabase.storage.from("scenarios").createSignedUrl(scenario.storage_path, 60 * 60, {
        download: scenario.original_name ?? "scenario.pdf",
      }),
    ]);
    lireUrl = lecture.data?.signedUrl ?? null;
    telechargerUrl = telechargement.data?.signedUrl ?? null;
  }

  return (
    <PageShell eyebrow="Fiche de lecture" title={assignment.project.title} theme="clair">
      <p className={formStyles.hint}>
        {[assignment.project.format, assignment.project.language].filter(Boolean).join(" · ")}
      </p>

      {lireUrl ? (
        <div className={styles.actions} style={{ marginTop: 20 }}>
          <a
            href={lireUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={formStyles.submit}
          >
            Lire en ligne
          </a>
          {telechargerUrl && (
            <a href={telechargerUrl} className={styles.choixBouton}>
              Télécharger le texte
            </a>
          )}
        </div>
      ) : (
        <p className={formStyles.hint}>Aucun document PDF n&apos;est rattaché à ce projet.</p>
      )}

      <form className={formStyles.form} action={submitReadingReport} style={{ marginTop: 32 }}>
        <input type="hidden" name="assignment_id" value={assignment.id} />
        <input type="hidden" name="project_id" value={assignment.project.id} />
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <div className={formStyles.field}>
          <span>Analyse du projet</span>
          <EditeurFiche
            assignmentId={assignment.id}
            brouillon={sanitizeFiche(assignment.draft_content ?? "")}
          />
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
