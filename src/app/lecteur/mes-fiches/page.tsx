import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import styles from "../lecteur.module.css";
import { createClient } from "@/lib/supabase/server";
import { etablirFacture } from "./actions";
import { createAdminClient } from "@/lib/supabase/admin";

type Report = {
  id: string;
  score: number | null;
  labellise: boolean;
  status: string;
  payment_status: string;
  invoice_id: string | null;
  facture: { numero: string } | null;
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
      "id, score, labellise, status, payment_status, submitted_at, invoice_id, project:projects(title), rating:reading_report_ratings(stars), facture:reader_invoices(numero)",
    )
    .eq("reader_id", user.id)
    .order("submitted_at", { ascending: false })
    .returns<Report[]>();

  // Les fiches écrites sur WFG 1, rattachées par l'ancien numéro de compte.
  // La table n'est lisible que de l'administration : on la lit côté serveur,
  // pour ce seul lecteur, et on n'en sort que le titre, la date et la note.
  const { data: moi } = await supabase
    .from("profiles")
    .select("legacy_user_id")
    .eq("id", user.id)
    .maybeSingle<{ legacy_user_id: number | null }>();
  const service = createAdminClient();
  const { data: anciennes } =
    service && moi?.legacy_user_id != null
      ? await service
          .from("legacy_reading_reports")
          .select(
            "legacy_review_id, final_mark, read_at, author_rating, project:projects(title)",
          )
          .eq("reader_legacy_id", moi.legacy_user_id)
          .eq("statut", 2)
          .order("read_at", { ascending: false })
          .returns<
            {
              legacy_review_id: number;
              final_mark: number | null;
              read_at: string | null;
              author_rating: number | null;
              project: { title: string } | null;
            }[]
          >()
      : { data: null };
  const lectures = anciennes ?? [];

  return (
    <PageShell
      eyebrow="Espace lecteur"
      title="Mes fiches de lecture"
      theme="clair"
    >
      {(reports ?? []).length === 0 ? (
        <p className={formStyles.hint}>
          Aucune fiche rédigée pour l&apos;instant.{" "}
          <Link href="/lecteur">Voir mes projets attribués</Link>.
        </p>
      ) : (
        <form action={etablirFacture}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Facturer</th>
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
                <tr
                  key={r.id}
                  className={r.invoice_id ? styles.paid : undefined}
                >
                  <td>
                    {r.invoice_id ? (
                      <span className={formStyles.hint}>
                        {r.facture?.numero}
                      </span>
                    ) : r.status === "validee_admin" ? (
                      <input type="checkbox" name="report_id" value={r.id} />
                    ) : (
                      <span className={formStyles.hint}>—</span>
                    )}
                  </td>
                  <td>
                    {r.project?.title ?? "—"}
                    {r.labellise && (
                      <span className={styles.badge}>Labellisé</span>
                    )}
                  </td>
                  <td>
                    {new Date(r.submitted_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td>{r.score ?? "—"} / 200</td>
                  <td>{STATUTS[r.status] ?? r.status}</td>
                  <td>{r.rating?.stars ? "★".repeat(r.rating.stars) : "—"}</td>
                  <td>{r.payment_status === "payee" ? "Payée" : "Due"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className={formStyles.hint} style={{ marginTop: 16 }}>
            Cochez les fiches à facturer. Celles qui portent déjà un numéro ont
            été facturées : elles ne peuvent pas l&apos;être une seconde fois.
          </p>
          <button type="submit" className={formStyles.submit}>
            Établir ma facture
          </button>
        </form>
      )}

      {lectures.length > 0 && (
        <>
          {/* Un mémo : si un projet lui semble familier, le lecteur vérifie ici
              (Cmd+F) qu'il l'a déjà lu. Titre, date, note — jamais l'auteur. */}
          <h2 className={styles.subhead}>
            Mes lectures sur l&apos;ancien site
          </h2>
          <p className={formStyles.hint}>
            {lectures.length} projets lus. Pour retrouver un titre : Cmd+F
            (Ctrl+F sur PC).
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Projet</th>
                <th>Lu le</th>
                <th>Ma note</th>
                <th>Satisfaction auteur</th>
              </tr>
            </thead>
            <tbody>
              {lectures.map((f) => (
                <tr key={f.legacy_review_id}>
                  <td>{f.project?.title ?? "Projet supprimé"}</td>
                  <td>
                    {f.read_at
                      ? new Date(f.read_at).toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                  <td>{f.final_mark ?? "—"}</td>
                  <td>{f.author_rating ? "★".repeat(f.author_rating) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p className={formStyles.linkRow} style={{ marginTop: 32 }}>
        <Link href="/lecteur">Retour à mes lectures</Link>
      </p>
    </PageShell>
  );
}
