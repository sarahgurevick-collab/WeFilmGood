import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import NavAdmin from "../NavAdmin";
import formStyles from "@/components/form.module.css";
import adminStyles from "../admin.module.css";
import { createClient } from "@/lib/supabase/server";
import { CHAMPS_ATELIER, dateAtelier, phaseAtelier, type Atelier } from "@/lib/ateliers";
import { creerAtelier } from "./actions";

const LIBELLE_PHASE = { "a-venir": "À venir", ouvert: "Salle ouverte", termine: "Terminé" };

/** Les ateliers en visio : les créer, puis gérer chacun depuis sa fiche. */
export default async function AteliersAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const { data: ateliers } = await supabase
    .from("ateliers")
    .select(CHAMPS_ATELIER)
    .order("debut", { ascending: false })
    .returns<Atelier[]>();

  return (
    <PageShell avantTitre={<NavAdmin />} title="Ateliers en visio" theme="clair">
      <p className={formStyles.hint}>
        Chaque atelier a sa salle de visio. Les intervenants (5 au plus) reçoivent un lien
        personnel par email ; le public, réservé aux membres connectés, regarde et pose ses
        questions par écrit. Vous les voyez arriver dans la régie.
      </p>

      <form className={formStyles.form} action={creerAtelier} style={{ marginTop: 32 }}>
        {erreur === "champs" && (
          <p className={formStyles.error}>Il faut au moins un titre et une date.</p>
        )}
        {erreur === "enregistrement" && (
          <p className={formStyles.error}>L&apos;atelier n&apos;a pas pu être créé. Réessayez.</p>
        )}
        <label className={formStyles.field}>
          <span>Titre</span>
          <input type="text" name="titre" required placeholder="Écrire une série courte" />
        </label>
        <label className={formStyles.field}>
          <span>Présentation (facultatif)</span>
          <textarea name="description" rows={3} />
        </label>
        <label className={formStyles.field}>
          <span>Date et heure (heure de Paris)</span>
          <input type="datetime-local" name="debut" required />
        </label>
        <label className={formStyles.field}>
          <span>Durée prévue (minutes)</span>
          <input type="number" name="duree_minutes" min={15} max={480} step={15} defaultValue={90} />
        </label>
        <button type="submit" className={formStyles.submit}>
          Créer l&apos;atelier
        </button>
      </form>

      <table className={adminStyles.table} style={{ marginTop: 40 }}>
        <thead>
          <tr>
            <th>Atelier</th>
            <th>Date</th>
            <th>État</th>
            <th>Rediffusion</th>
          </tr>
        </thead>
        <tbody>
          {(ateliers ?? []).length === 0 && (
            <tr>
              <td colSpan={4} style={{ color: "var(--dim)" }}>
                Aucun atelier pour l&apos;instant.
              </td>
            </tr>
          )}
          {(ateliers ?? []).map((a) => (
            <tr key={a.id}>
              <td>
                <Link href={`/admin/ateliers/${a.id}`}>{a.titre}</Link>
              </td>
              <td>{dateAtelier(a.debut)}</td>
              <td>{LIBELLE_PHASE[phaseAtelier(a)]}</td>
              <td>
                {a.rediffusion_envoyee_le
                  ? "Envoyée"
                  : a.rediffusion_fichier
                    ? "Choisie, pas envoyée"
                    : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageShell>
  );
}
