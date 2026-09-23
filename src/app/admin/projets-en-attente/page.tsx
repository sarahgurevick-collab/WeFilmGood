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
 * à compter de tête : on affiche le délai écoulé, et il passe en rouge
 * dès 6 jours — assez tôt pour réattribuer le projet avant l'échéance,
 * plutôt que de constater le retard une fois qu'il est là.
 */
const ALERTE_JOURS = 6;

const FORMATS_COURTS: Record<string, string> = {
  long_metrage: "LM",
  court_metrage: "CM",
  serie: "TV",
  immersif_360_vr: "VR",
};

const LANGUES: Record<string, string> = { fr: "fr", en: "ang" };

function formatCourt(format: string | null, langue: string | null): string {
  const abrege = format ? (FORMATS_COURTS[format] ?? format) : null;
  const lang = langue ? (LANGUES[langue] ?? langue) : null;
  if (!abrege) return lang ? `(${lang})` : "—";
  return lang ? `${abrege} (${lang})` : abrege;
}

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

  // Le voyant que chaque lecteur règle lui-même : l'attribution se fait
  // tous les jours en fonction des disponibilités, autant les montrer
  // plutôt que de les faire retenir.
  const { data: voyants } = await supabase
    .from("reader_profiles")
    .select("profile_id, availability_status")
    .returns<{ profile_id: string; availability_status: string }[]>();

  const voyantDe = new Map((voyants ?? []).map((v) => [v.profile_id, v.availability_status]));
  const parVoyant = (couleur: string) =>
    (readers ?? [])
      .filter((r) => (voyantDe.get(r.profile_id) ?? "vert") === couleur)
      .sort((a, b) => (a.profile?.full_name ?? "").localeCompare(b.profile?.full_name ?? ""));

  const GROUPES = [
    { couleur: "vert", libelle: "Disponibles" },
    { couleur: "orange", libelle: "Peu disponibles" },
    { couleur: "rouge", libelle: "Indisponibles" },
  ];

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
    <PageShell eyebrow="Administration" title="Projets en attente" theme="clair">
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
                  <Link
                    href={`/projet/${p.project_id}`}
                    className={adminStyles.titreCourt}
                    title={p.title}
                  >
                    {p.title}
                  </Link>
                  <a
                    href={`/projet/${p.project_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={adminStyles.iconePdf}
                    title="Ouvrir le projet (nouvel onglet)"
                    aria-label="Ouvrir le projet dans un nouvel onglet"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M15 3h6v6" />
                      <path d="M10 14 21 3" />
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    </svg>
                  </a>
                  <ScenarioLink projectId={p.project_id} />
                  {/* « Sans lecteur » se lit déjà dans la colonne Lecteur. */}
                  {p.reading_status !== "sans_lecteur" && (
                    <>
                      <br />
                      <span className={formStyles.hint}>
                        {ETATS[p.reading_status] ?? p.reading_status}
                      </span>
                    </>
                  )}
                </td>
                <td>{formatCourt(p.format, p.language)}</td>
                <td>
                  {new Date(p.submitted_at).toLocaleDateString("fr-FR")}
                  <br />
                  <span
                    className={formStyles.hint}
                    style={joursDepuis(p.submitted_at) >= ALERTE_JOURS ? { color: "#e2231a", fontWeight: 600 } : undefined}
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
                      {GROUPES.map(({ couleur, libelle }) => {
                        const lecteurs = parVoyant(couleur);
                        if (lecteurs.length === 0) return null;
                        return (
                          <optgroup key={couleur} label={libelle}>
                            {lecteurs.map((r) => (
                              <option key={r.profile_id} value={r.profile_id}>
                                {r.profile?.full_name ?? r.profile_id.slice(0, 8)}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
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
      <p className={formStyles.linkRow}>
        <Link href="/admin/fiches">Voir toutes les fiches de lecture</Link>
      </p>

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
