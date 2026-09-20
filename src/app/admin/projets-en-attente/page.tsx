import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import adminStyles from "../admin.module.css";
import { createClient } from "@/lib/supabase/server";
import { markReportPaid, reassignReader } from "./actions";
import ScenarioLink from "./ScenarioLink";

type PendingProject = {
  project_id: string;
  author_name: string | null;
  author_email: string | null;
  title: string;
  format: string | null;
  language: string | null;
  submitted_at: string;
  current_reader_id: string | null;
  current_reader_name: string | null;
  reader_refusal_count: number;
  reading_status: string;
};

type Reader = {
  profile_id: string;
  profile: { full_name: string | null } | null;
};

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

const ETATS: Record<string, string> = {
  sans_lecteur: "Sans lecteur",
  proposee: "Proposée au lecteur",
  en_cours: "Acceptée, en lecture",
  rendue: "Fiche rendue",
  refusee: "Refusée par le lecteur",
};

/**
 * L'objectif est de rendre l'analyse en 10 jours. Une date seule oblige
 * à compter de tête : on affiche le délai, en rouge au-delà du délai.
 */
function joursDepuis(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

function delaiEcoule(date: string): string {
  const jours = joursDepuis(date);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "il y a 1 jour";
  if (jours < 31) return `il y a ${jours} jours`;
  const mois = Math.floor(jours / 30);
  return mois === 1 ? "il y a 1 mois" : `il y a ${mois} mois`;
}

export default async function ProjetsEnAttentePage() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    redirect("/");
  }

  const { data: pendingRows } = await supabase.rpc("admin_pending_projects");
  const projects = (pendingRows ?? []) as PendingProject[];

  const { data: readers } = await supabase
    .from("profile_roles")
    .select("profile_id, profile:profiles(full_name)")
    .eq("role_slug", "lecteur")
    .returns<Reader[]>();

  const { data: pendingReports } = await supabase
    .from("reading_reports")
    .select("id, score, labellise, submitted_at, project:projects(title), reader:profiles(full_name)")
    .eq("status", "soumise")
    .order("submitted_at", { ascending: true })
    .returns<PendingReport[]>();

  const { data: paidReports } = await supabase
    .from("reading_reports")
    .select(
      "id, payment_status, submitted_at, project:projects(title), reader:profiles(full_name)",
    )
    .eq("status", "validee_admin")
    .order("submitted_at", { ascending: false })
    .returns<PaidReport[]>();

  return (
    <PageShell eyebrow="Administration" title="Projets en attente" wide>
      <p className={formStyles.hint}>
        Tableau de bord des projets reçus : sans lecteur attribué, en cours de
        lecture, ou avec une fiche en attente de validation définitive.
      </p>

      {(projects ?? []).length === 0 ? (
        <p className={formStyles.hint} style={{ marginTop: 24 }}>
          Aucun projet en attente.
        </p>
      ) : (
        <table className={adminStyles.table} style={{ marginTop: 24 }}>
          <thead>
            <tr>
              <th>Auteur</th>
              <th>Projet</th>
              <th>Format</th>
              <th>PDF</th>
              <th>Déposé le</th>
              <th>Lecteur</th>
              <th>Attribuer</th>
            </tr>
          </thead>
          <tbody>
            {(projects ?? []).map((p) => (
              <tr key={p.project_id}>
                <td>
                  {p.author_name ?? "Sans nom"}
                  <br />
                  <span className={formStyles.hint}>{p.author_email}</span>
                </td>
                <td>
                  <Link href={`/projets/${p.project_id}`}>{p.title}</Link>
                  <br />
                  <span className={formStyles.hint}>
                    {ETATS[p.reading_status] ?? p.reading_status}
                  </span>
                </td>
                <td>{[p.format, p.language].filter(Boolean).join(" · ") || "—"}</td>
                <td>
                  <ScenarioLink projectId={p.project_id} />
                </td>
                <td>
                  {new Date(p.submitted_at).toLocaleDateString("fr-FR")}
                  <br />
                  <span
                    className={formStyles.hint}
                    style={joursDepuis(p.submitted_at) > 10 ? { color: "#e2231a", fontWeight: 600 } : undefined}
                  >
                    {delaiEcoule(p.submitted_at)}
                  </span>
                </td>
                <td>{p.current_reader_name ?? "—"}</td>
                <td>
                  <form action={reassignReader} className={adminStyles.inlineForm}>
                    <input type="hidden" name="project_id" value={p.project_id} />
                    <select name="reader_id" defaultValue="" required>
                      <option value="" disabled>
                        Choisir…
                      </option>
                      {(readers ?? []).map((r) => (
                        <option key={r.profile_id} value={r.profile_id}>
                          {r.profile?.full_name ?? r.profile_id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className={adminStyles.linkButton}>
                      Attribuer
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className={adminStyles.subhead}>Fiches en attente de validation</h2>

      {(pendingReports ?? []).length === 0 ? (
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
                  {r.labellise && <span className={adminStyles.badge}>Labellise</span>}
                </td>
                <td>{new Date(r.submitted_at).toLocaleDateString("fr-FR")}</td>
                <td>
                  <Link href={`/admin/fiches/${r.id}`} className={adminStyles.linkButton}>
                    Ouvrir et publier
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className={adminStyles.subhead}>Fiches publiées — rémunération</h2>

      {(paidReports ?? []).length === 0 ? (
        <p className={formStyles.hint}>Aucune fiche publiée pour l&apos;instant.</p>
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
      )}

      <p className={formStyles.linkRow} style={{ marginTop: 32 }}>
        <Link href="/admin">Retour à l&apos;administration</Link>
      </p>
    </PageShell>
  );
}
