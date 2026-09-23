import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import NavAdmin from "../NavAdmin";
import formStyles from "@/components/form.module.css";
import adminStyles from "../admin.module.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { markReportPaid } from "../projets-en-attente/actions";

/**
 * Les fiches rendues par les lecteurs, à relire avant publication — l'une
 * des deux pages « à valider » dont Sarah se sert tous les jours, avec les
 * profils. En dessous, la rémunération des fiches publiées.
 */

type PendingReport = {
  id: string;
  score: number | null;
  labellise: boolean;
  submitted_at: string;
  project: { title: string } | null;
  reader: { full_name: string | null } | null;
};

type PaidReport = {
  id: string;
  payment_status: string;
  submitted_at: string;
  project: { title: string } | null;
  reader: { full_name: string | null } | null;
};

export default async function FichesAValiderPage() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const { data: pendingReports } = await supabase
    .from("reading_reports")
    .select(
      "id, score, labellise, submitted_at, project:projects(title), reader:profiles(full_name)",
    )
    .eq("status", "soumise")
    .order("submitted_at", { ascending: true })
    .returns<PendingReport[]>();

  // Les fiches de WFG 1 rendues mais pas encore relues (statut 1, migration
  // 0071). Elles se relisent sur l'ancien site jusqu'à la bascule : on les
  // montre ici pour que la file d'attente soit complète.
  const admin = createAdminClient();
  const { data: ficheesWfg1 } = admin
    ? await admin
        .from("legacy_reading_reports")
        .select(
          "legacy_review_id, read_at, final_mark, reader_legacy_id, project:projects(id, title)",
        )
        .eq("statut", 1)
        .order("read_at", { ascending: false })
        .returns<
          {
            legacy_review_id: number;
            read_at: string | null;
            final_mark: number | null;
            reader_legacy_id: number | null;
            project: { id: string; title: string } | null;
          }[]
        >()
    : { data: null };
  const idsLecteursWfg1 = [
    ...new Set(
      (ficheesWfg1 ?? [])
        .map((f) => f.reader_legacy_id)
        .filter((id): id is number => id != null),
    ),
  ];
  const { data: lecteursWfg1 } =
    admin && idsLecteursWfg1.length
      ? await admin
          .from("legacy_profiles")
          .select("legacy_user_id, full_name")
          .in("legacy_user_id", idsLecteursWfg1)
      : { data: null };
  const nomLecteurWfg1 = new Map(
    (lecteursWfg1 ?? []).map((l) => [l.legacy_user_id, l.full_name]),
  );

  const { data: paidReports } = await supabase
    .from("reading_reports")
    .select(
      "id, payment_status, submitted_at, project:projects(title), reader:profiles(full_name)",
    )
    .eq("status", "validee_admin")
    .order("submitted_at", { ascending: false })
    .returns<PaidReport[]>();

  return (
    <PageShell avantTitre={<NavAdmin />} title="Fiches à valider" theme="clair">
      {(pendingReports ?? []).length === 0 &&
      (ficheesWfg1 ?? []).length === 0 ? (
        <p className={formStyles.hint}>Aucune fiche à valider.</p>
      ) : (
        <table className={adminStyles.table}>
          <thead>
            <tr>
              <th>Projet</th>
              <th>Lecteur</th>
              <th>Note</th>
              <th>Rendue le</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(pendingReports ?? []).map((r) => (
              <tr key={r.id}>
                <td>{r.project?.title ?? "—"}</td>
                <td>{r.reader?.full_name ?? "—"}</td>
                <td>
                  {r.score ?? "—"} / 200
                  {r.labellise && (
                    <span className={adminStyles.badge}>Labellise</span>
                  )}
                </td>
                <td>{new Date(r.submitted_at).toLocaleDateString("fr-FR")}</td>
                <td>
                  <Link
                    href={`/admin/fiches/${r.id}`}
                    className={adminStyles.linkButton}
                  >
                    Ouvrir et publier
                  </Link>
                </td>
              </tr>
            ))}
            {(ficheesWfg1 ?? []).map((f) => (
              <tr key={`wfg1-${f.legacy_review_id}`}>
                <td>{f.project?.title ?? "—"}</td>
                <td>
                  {(f.reader_legacy_id != null &&
                    nomLecteurWfg1.get(f.reader_legacy_id)) ||
                    "—"}
                </td>
                <td>{f.final_mark ?? "—"} / 200</td>
                <td>
                  {f.read_at
                    ? new Date(f.read_at).toLocaleDateString("fr-FR")
                    : "—"}
                </td>
                <td>
                  {f.project && (
                    <Link
                      href={`/projet/${f.project.id}`}
                      className={adminStyles.linkButton}
                    >
                      À relire sur WFG 1
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2 className={adminStyles.subhead}>Fiches publiées — rémunération</h2>
      {(paidReports ?? []).length === 0 ? (
        <p className={formStyles.hint}>
          Aucune fiche publiée pour l&apos;instant.
        </p>
      ) : (
        <table className={adminStyles.table}>
          <thead>
            <tr>
              <th>Projet</th>
              <th>Lecteur</th>
              <th>Publiée le</th>
              <th>Rémunération</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(paidReports ?? []).map((r) => (
              <tr key={r.id}>
                <td>{r.project?.title ?? "—"}</td>
                <td>{r.reader?.full_name ?? "—"}</td>
                <td>{new Date(r.submitted_at).toLocaleDateString("fr-FR")}</td>
                <td>{r.payment_status === "payee" ? "Payée" : "Due"}</td>
                <td>
                  {r.payment_status !== "payee" && (
                    <form action={markReportPaid}>
                      <input type="hidden" name="report_id" value={r.id} />
                      <button type="submit" className={adminStyles.linkButton}>
                        Marquer payée
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}{" "}
    </PageShell>
  );
}
