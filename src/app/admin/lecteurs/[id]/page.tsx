import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import adminStyles from "../../admin.module.css";
import NavAdmin from "../../NavAdmin";
import { prendreLaPlace } from "../../profils/prise-de-place";
import Factures, { SELECTION_FACTURES, versFactures } from "../Factures";

/**
 * La fiche d'un lecteur, pour l'administration : toutes ses fiches de
 * lecture — celles du nouveau site et celles reprises de WFG 1, pour
 * mémoire — et ses factures. C'est le lecteur qui coche les fiches à se
 * faire payer et établit sa facture ; ici, on la marque payée.
 */

const VOYANTS: Record<string, string> = {
  vert: "Disponible",
  orange: "Peu disponible",
  rouge: "Indisponible",
};

const STATUTS: Record<string, string> = {
  soumise: "À valider",
  validee_admin: "Publiée",
  rejetee_admin: "Rejetée",
};

export default async function FicheLecteurPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const admin = createAdminClient();
  if (!admin) redirect("/admin/lecteurs");

  const [
    { data: profil },
    { data: role },
    { data: lecteur },
    { data: compte },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, legacy_user_id")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("profile_roles")
      .select("role_slug")
      .eq("profile_id", id)
      .eq("role_slug", "lecteur")
      .maybeSingle(),
    admin
      .from("reader_profiles")
      .select("availability_status, tarif_cents")
      .eq("profile_id", id)
      .maybeSingle(),
    admin.auth.admin.getUserById(id),
  ]);
  if (!profil || !role) notFound();

  const [{ data: nouvelles }, { data: anciennes }, { data: facturesBrutes }] =
    await Promise.all([
      admin
        .from("reading_reports")
        .select(
          "id, score, status, payment_status, submitted_at, facture:reader_invoices(numero), project:projects(id, title)",
        )
        .eq("reader_id", id)
        .order("submitted_at", { ascending: false })
        .returns<
          {
            id: string;
            score: number | null;
            status: string;
            payment_status: string;
            submitted_at: string;
            facture: { numero: string } | null;
            project: { id: string; title: string } | null;
          }[]
        >(),
      profil.legacy_user_id != null
        ? admin
            .from("legacy_reading_reports")
            .select(
              "legacy_review_id, final_mark, read_at, statut, author_rating, project:projects(id, title)",
            )
            .eq("reader_legacy_id", profil.legacy_user_id)
            .neq("statut", 0)
            .order("read_at", { ascending: false })
            .returns<
              {
                legacy_review_id: number;
                final_mark: number | null;
                read_at: string | null;
                statut: number;
                author_rating: number | null;
                project: { id: string; title: string } | null;
              }[]
            >()
        : Promise.resolve({ data: [] }),
      admin
        .from("reader_invoices")
        .select(SELECTION_FACTURES)
        .eq("reader_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const tarif = (lecteur?.tarif_cents ?? 1500) / 100;

  return (
    <PageShell
      avantTitre={<NavAdmin />}
      eyebrow="Lecteur"
      title={profil.full_name ?? "Lecteur"}
      theme="clair"
    >
      <p className={formStyles.hint}>
        {compte.user?.email} · {VOYANTS[lecteur?.availability_status ?? "vert"]}{" "}
        · {tarif} € par fiche ·{" "}
        {(nouvelles ?? []).length + (anciennes ?? []).length} fiches au total
      </p>
      <form action={prendreLaPlace} style={{ marginTop: 8 }}>
        <input type="hidden" name="profile_id" value={id} />
        <button type="submit" className={adminStyles.linkButton}>
          Voir son espace, comme lui
        </button>
      </form>

      <h2 className={adminStyles.subhead}>Fiches du nouveau site</h2>
      {(nouvelles ?? []).length === 0 ? (
        <p className={formStyles.hint}>
          Aucune fiche rendue sur le nouveau site pour l&apos;instant. Chaque
          fiche publiée apparaîtra ici, avec une case à cocher pour la marquer
          payée.
        </p>
      ) : (
        <table className={adminStyles.table}>
          <thead>
            <tr>
              <th>Rémunération</th>
              <th>Projet</th>
              <th>Rendue le</th>
              <th>Note</th>
              <th>Statut</th>
              <th>Facture</th>
            </tr>
          </thead>
          <tbody>
            {(nouvelles ?? []).map((f) => (
              <tr key={f.id}>
                <td>
                  {f.payment_status === "payee"
                    ? "✓ Payée"
                    : f.payment_status === "due"
                      ? "Due"
                      : "—"}
                </td>
                <td>
                  {f.project ? (
                    <Link href={`/projet/${f.project.id}`}>
                      {f.project.title}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td>{new Date(f.submitted_at).toLocaleDateString("fr-FR")}</td>
                <td>{f.score ?? "—"}</td>
                <td>
                  <Link href={`/admin/fiches/${f.id}`}>
                    {STATUTS[f.status] ?? f.status}
                  </Link>
                </td>
                <td>{f.facture?.numero ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className={adminStyles.subhead}>Factures</h2>
      <p className={formStyles.hint}>
        Le lecteur coche lui-même, dans son espace, les fiches qu&apos;il veut
        se faire payer, puis établit sa facture. Elle apparaît ici : ouvrez-la,
        réglez-la, puis « Marquer payée ».
      </p>
      <Factures
        factures={versFactures(facturesBrutes)}
        retour={`/admin/lecteurs/${id}`}
        avecLecteur={false}
      />

      <h2 className={adminStyles.subhead}>Fiches de l&apos;ancien site</h2>
      {(anciennes ?? []).length === 0 ? (
        <p className={formStyles.hint}>
          Aucune fiche reprise de l&apos;ancien site.
        </p>
      ) : (
        <>
          <p className={formStyles.hint}>
            {(anciennes ?? []).length} fiches, réglées sur l&apos;ancien site :
            pour mémoire, sans paiement à suivre ici.
          </p>
          <table className={adminStyles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Projet</th>
                <th>Note</th>
                <th>Satisfaction auteur</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(anciennes ?? []).map((f) => (
                <tr key={f.legacy_review_id}>
                  <td>
                    {f.read_at
                      ? new Date(f.read_at).toLocaleDateString("fr-FR")
                      : "—"}
                  </td>
                  <td>
                    {f.project ? (
                      <Link href={`/projet/${f.project.id}`}>
                        {f.project.title}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{f.final_mark ?? "—"}</td>
                  <td>{f.author_rating ? "★".repeat(f.author_rating) : "—"}</td>
                  <td>
                    <Link
                      href={`/admin/fiches/ancienne/${f.legacy_review_id}`}
                      className={adminStyles.linkButton}
                    >
                      {f.statut === 1 ? "À relire" : "Lire la fiche"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </PageShell>
  );
}
