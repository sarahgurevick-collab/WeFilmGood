import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import styles from "../lecteur.module.css";
import { createClient } from "@/lib/supabase/server";

type Report = {
  id: string;
  score: number | null;
  labellise: boolean;
  status: string;
  payment_status: string;
  submitted_at: string;
  project: { title: string } | null;
  rating: { stars: number } | null;
};

const STATUTS: Record<string, string> = {
  soumise: "En attente de validation",
  validee_admin: "Validée",
  rejetee_admin: "Rejetée",
};

export default async function MesFichesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/lecteur/mes-fiches");
  }

  const { data: reports } = await supabase
    .from("reading_reports")
    .select(
      "id, score, labellise, status, payment_status, submitted_at, project:projects(title), rating:reading_report_ratings(stars)",
    )
    .eq("reader_id", user.id)
    .order("submitted_at", { ascending: false })
    .returns<Report[]>();

  return (
    <PageShell eyebrow="Espace lecteur" title="Mes fiches de lecture" wide>
      {(reports ?? []).length === 0 ? (
        <p className={formStyles.hint}>
          Aucune fiche rédigée pour l&apos;instant.{" "}
          <Link href="/lecteur">Voir mes projets attribués</Link>.
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Projet</th>
              <th>Date</th>
              <th>Note</th>
              <th>Statut</th>
              <th>Satisfaction auteur</th>
              <th>Rémunération</th>
            </tr>
          </thead>
          <tbody>
            {(reports ?? []).map((r) => (
              <tr key={r.id} className={r.payment_status === "payee" ? styles.paid : undefined}>
                <td>
                  {r.project?.title ?? "—"}
                  {r.labellise && <span className={styles.badge}>Labellisé</span>}
                </td>
                <td>{new Date(r.submitted_at).toLocaleDateString("fr-FR")}</td>
                <td>{r.score ?? "—"} / 200</td>
                <td>{STATUTS[r.status] ?? r.status}</td>
                <td>{r.rating?.stars ? "★".repeat(r.rating.stars) : "—"}</td>
                <td>{r.payment_status === "payee" ? "Payée" : "Due"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className={formStyles.linkRow} style={{ marginTop: 32 }}>
        <Link href="/lecteur">Retour à mes lectures</Link>
      </p>
    </PageShell>
  );
}
