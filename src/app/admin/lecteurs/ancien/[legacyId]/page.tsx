import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import adminStyles from "../../../admin.module.css";
import NavAdmin from "../../../NavAdmin";
import { reactiverLecteur } from "../../actions";

/**
 * La fiche d'un ancien lecteur de WFG 1, qui n'a pas (encore) de compte sur
 * le nouveau site : son profil repris, toutes ses fiches, et de quoi le
 * réactiver le jour où on en a besoin.
 */
export default async function AncienLecteurPage({
  params,
  searchParams,
}: {
  params: Promise<{ legacyId: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { legacyId } = await params;
  const { erreur } = await searchParams;
  const id = Number(legacyId);

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const admin = createAdminClient();
  if (!admin) redirect("/admin/lecteurs");

  // Déjà réactivé : sa fiche est celle de son compte.
  const { data: compte } = await admin
    .from("profiles")
    .select("id")
    .eq("legacy_user_id", id)
    .maybeSingle();
  if (compte) redirect(`/admin/lecteurs/${compte.id}`);

  const [{ data: ancien }, { data: fiches }] = await Promise.all([
    admin
      .from("legacy_profiles")
      .select("full_name, email, city, country, biofilmo")
      .eq("legacy_user_id", id)
      .maybeSingle(),
    admin
      .from("legacy_reading_reports")
      .select(
        "legacy_review_id, final_mark, read_at, statut, author_rating, project:projects(id, title)",
      )
      .eq("reader_legacy_id", id)
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
      >(),
  ]);

  const nom = ancien?.full_name ?? `Compte supprimé (n° ${id})`;
  const lieu = [ancien?.city, ancien?.country].filter(Boolean).join(", ");

  return (
    <PageShell nav="admin"
      avantTitre={<NavAdmin />}
      eyebrow="Ancien lecteur"
      title={nom}
      theme="clair"
    >
      <p className={formStyles.hint}>
        {ancien?.email ?? "adresse inconnue"}
        {lieu && ` · ${lieu}`} · {(fiches ?? []).length} fiches sur
        l&apos;ancien site · pas de compte sur le nouveau site
      </p>

      {ancien ? (
        <form action={reactiverLecteur} style={{ marginTop: 16 }}>
          <input type="hidden" name="legacy_id" value={id} />
          <button type="submit" className={formStyles.submit}>
            Réactiver ce lecteur
          </button>
          <p className={formStyles.hint} style={{ marginTop: 8 }}>
            Crée son compte de lecteur, sans lui envoyer d&apos;email. Pour se
            connecter, il demandera un lien avec son adresse habituelle. Il
            retrouvera ses lectures en mémo.
          </p>
        </form>
      ) : (
        <p className={formStyles.hint} style={{ marginTop: 16 }}>
          Son compte avait été supprimé sur l&apos;ancien site : ses fiches
          restent, mais il ne peut pas être réactivé.
        </p>
      )}
      {erreur && (
        <p className={formStyles.error}>
          La réactivation n&apos;a pas abouti ({erreur}).
        </p>
      )}

      {ancien?.biofilmo && (
        <div className={adminStyles.motivation} style={{ marginTop: 24 }}>
          <strong>Biographie reprise de l&apos;ancien site</strong>
          <p style={{ whiteSpace: "pre-wrap" }}>{ancien.biofilmo}</p>
        </div>
      )}

      <h2 className={adminStyles.subhead}>Ses fiches</h2>
      {(fiches ?? []).length === 0 ? (
        <p className={formStyles.hint}>Aucune fiche rendue.</p>
      ) : (
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
            {(fiches ?? []).map((f) => (
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
      )}
    </PageShell>
  );
}
