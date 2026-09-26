import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import adminStyles from "../../../admin.module.css";
import NavAdmin from "../../../NavAdmin";
import ScoreSlider from "@/app/lecteur/[assignmentId]/ScoreSlider";
import { validerFicheAncienne } from "./actions";

/**
 * Une fiche de lecture reprise de WFG 1, telle que le lecteur l'a rendue.
 *
 * Vérifiée (statut 2) : lecture seule. Rendue mais jamais relue (statut
 * 1) : Sarah la relit ici — texte corrigeable, note au curseur, bouton
 * « Valider » — comme une fiche de WFG 2 (demande du 26/09/2026).
 */
export default async function FicheAnciennePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const admin = createAdminClient();
  if (!admin) redirect("/admin/fiches-a-valider");

  const { data: fiche } = await admin
    .from("legacy_reading_reports")
    .select(
      "legacy_review_id, content, final_mark, read_at, statut, reader_legacy_id, project:projects(id, title)",
    )
    .eq("legacy_review_id", Number(id))
    .maybeSingle<{
      legacy_review_id: number;
      content: string | null;
      final_mark: number | null;
      read_at: string | null;
      statut: number;
      reader_legacy_id: number | null;
      project: { id: string; title: string } | null;
    }>();

  if (!fiche) redirect("/admin/fiches-a-valider");

  const { data: lecteur } = fiche.reader_legacy_id
    ? await admin
        .from("legacy_profiles")
        .select("full_name")
        .eq("legacy_user_id", fiche.reader_legacy_id)
        .maybeSingle()
    : { data: null };

  const aRelire = fiche.statut === 1;

  return (
    <PageShell nav="admin"
      avantTitre={<NavAdmin />}
      eyebrow="Fiche de lecture"
      title={fiche.project?.title ?? "Projet supprimé"}
      theme="clair"
    >
      <p className={formStyles.hint}>
        Rendue par {lecteur?.full_name ?? "—"} le{" "}
        {fiche.read_at
          ? new Date(fiche.read_at).toLocaleDateString("fr-FR")
          : "—"}{" "}
        · note du lecteur {fiche.final_mark ?? "—"} / 200
        {fiche.project && (
          <>
            {" · "}
            <Link href={`/projet/${fiche.project.id}`}>
              voir la fiche projet
            </Link>
          </>
        )}
      </p>

      {aRelire ? (
        <>
          <p className={adminStyles.motivation}>
            <strong>Fiche de l&apos;ancien site, pas encore validée</strong>
            L&apos;auteur ne la voit pas. Relisez, corrigez le texte au besoin,
            posez la note, puis validez : elle devient visible de l&apos;auteur,
            et le projet est labellisé si la note dépasse 150.
          </p>

          <form className={formStyles.form} action={validerFicheAncienne} style={{ marginTop: 32 }}>
            <input type="hidden" name="legacy_review_id" value={fiche.legacy_review_id} />
            <label className={formStyles.field}>
              <span>Texte publié à l&apos;auteur</span>
              <textarea name="content" rows={28} required defaultValue={fiche.content ?? ""} />
            </label>
            <ScoreSlider defaultValue={fiche.final_mark ?? 100} />
            <button type="submit" className={formStyles.submit}>
              Valider
            </button>
          </form>
        </>
      ) : (
        <div className={formStyles.field} style={{ marginTop: 32 }}>
          <span>Texte rendu par le lecteur</span>
          <div className={adminStyles.ficheTexte}>
            {fiche.content?.trim() || "Fiche vide."}
          </div>
        </div>
      )}

      <p className={formStyles.linkRow} style={{ marginTop: 32 }}>
        <Link href="/admin/fiches-a-valider">Retour aux fiches à valider</Link>
      </p>
    </PageShell>
  );
}
