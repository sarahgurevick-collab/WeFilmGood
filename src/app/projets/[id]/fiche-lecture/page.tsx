import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import styles from "./fiche.module.css";
import { createClient } from "@/lib/supabase/server";
import { rateReport } from "./actions";

type Report = {
  report_id: string;
  content: string | null;
  score: number | null;
  labellise: boolean;
  reader_first_name: string | null;
  submitted_at: string;
};

export default async function FicheLecturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/connexion?next=/projets/${id}/fiche-lecture`);
  }

  // La fonction ne renvoie la fiche qu'au titulaire du projet, et
  // uniquement le prénom du lecteur : son identité complète n'est
  // jamais exposée à l'auteur.
  const { data: reportRows } = await supabase.rpc("get_project_reading_report", {
    p_project_id: id,
  });

  const report = ((reportRows ?? []) as Report[])[0];

  if (!report) {
    return (
      <PageShell eyebrow="Fiche de lecture" title="Pas encore disponible">
        <p className={formStyles.hint}>
          Aucune fiche de lecture validée pour ce projet pour l&apos;instant.{" "}
          <Link href={`/projets/${id}`}>Retour au projet</Link>.
        </p>
      </PageShell>
    );
  }

  const { data: rating } = await supabase
    .from("reading_report_ratings")
    .select("stars")
    .eq("reading_report_id", report.report_id)
    .maybeSingle();

  return (
    <PageShell eyebrow="Fiche de lecture" title={`Analyse par ${report.reader_first_name ?? "un lecteur"}`}>
      <p className={formStyles.hint}>
        Rendue le {new Date(report.submitted_at).toLocaleDateString("fr-FR")} · Note{" "}
        {report.score ?? "—"} / 200
        {report.labellise && " · Projet labellisé WFG"}
      </p>

      <div className={styles.content}>{report.content}</div>

      <h2 className={styles.subhead}>Votre satisfaction</h2>

      {rating ? (
        <p className={formStyles.hint}>
          Vous avez attribué {"★".repeat(rating.stars)} à cette fiche de lecture.
        </p>
      ) : (
        <form className={formStyles.form} action={rateReport}>
          <input type="hidden" name="report_id" value={report.report_id} />
          <input type="hidden" name="project_id" value={id} />
          <div className={formStyles.field}>
            <span>Notez cette analyse</span>
            <div className={formStyles.roles}>
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className={formStyles.role}>
                  <input type="radio" name="stars" value={n} required />
                  {"★".repeat(n)}
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className={formStyles.submit}>
            Envoyer
          </button>
        </form>
      )}

      <p className={formStyles.linkRow} style={{ marginTop: 32 }}>
        <Link href={`/projets/${id}`}>Retour au projet</Link>
      </p>
    </PageShell>
  );
}
