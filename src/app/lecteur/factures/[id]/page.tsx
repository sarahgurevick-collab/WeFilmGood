import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import styles from "./facture.module.css";

type Facture = {
  id: string;
  numero: string;
  tarif_cents: number;
  created_at: string;
  reader_id: string;
};

type Ligne = { id: string; submitted_at: string; project: { title: string } | null };

/**
 * La facture d'un lecteur, prête à imprimer ou à enregistrer en PDF.
 *
 * Les coordonnées sont reprises du profil : un lecteur qui les corrige
 * une fois n'a plus à les retaper à chaque facture.
 */
export default async function FacturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/lecteur/factures/${id}`);

  const { data: facture } = await supabase
    .from("reader_invoices")
    .select("id, numero, tarif_cents, created_at, reader_id")
    .eq("id", id)
    .maybeSingle<Facture>();

  if (!facture) notFound();

  const [{ data: lignes }, { data: profil }, { data: prive }] = await Promise.all([
    supabase
      .from("reading_reports")
      .select("id, submitted_at, project:projects(title)")
      .eq("invoice_id", id)
      .order("submitted_at")
      .returns<Ligne[]>(),
    supabase
      .from("profiles")
      .select("full_name, city, country")
      .eq("id", facture.reader_id)
      .maybeSingle<{ full_name: string | null; city: string | null; country: string | null }>(),
    supabase
      .from("profile_private_details")
      .select("address, postal_code, phone")
      .eq("profile_id", facture.reader_id)
      .maybeSingle<{ address: string | null; postal_code: string | null; phone: string | null }>(),
  ]);

  const nb = (lignes ?? []).length;
  const total = (nb * facture.tarif_cents) / 100;
  const euros = (c: number) => (c / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 });

  return (
    <PageShell eyebrow="Espace lecteur" title={`Facture ${facture.numero}`} theme="clair">
      <div className={styles.entete}>
        <div>
          <strong>{profil?.full_name ?? "—"}</strong>
          {prive?.address && (
            <>
              <br />
              {prive.address}
            </>
          )}
          {(prive?.postal_code || profil?.city) && (
            <>
              <br />
              {[prive?.postal_code, profil?.city].filter(Boolean).join(" ")}
            </>
          )}
          {profil?.country && (
            <>
              <br />
              {profil.country}
            </>
          )}
          {prive?.phone && (
            <>
              <br />
              {prive.phone}
            </>
          )}
        </div>
        <div className={styles.destinataire}>
          <span className={formStyles.hint}>Facturé à</span>
          <br />
          <strong>La Maison des Scénaristes</strong>
          <br />
          WeFilmGood
        </div>
      </div>

      <p className={formStyles.hint}>
        Établie le{" "}
        {new Date(facture.created_at).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Projet analysé</th>
            <th>Fiche rendue le</th>
            <th className={styles.nombre}>Montant</th>
          </tr>
        </thead>
        <tbody>
          {(lignes ?? []).map((l) => (
            <tr key={l.id}>
              <td>{l.project?.title ?? "—"}</td>
              <td>{new Date(l.submitted_at).toLocaleDateString("fr-FR")}</td>
              <td className={styles.nombre}>{euros(facture.tarif_cents)} €</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}>
              <strong>
                Total — {nb} fiche{nb > 1 ? "s" : ""} de lecture
              </strong>
            </td>
            <td className={styles.nombre}>
              <strong>{total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</strong>
            </td>
          </tr>
        </tfoot>
      </table>

    </PageShell>
  );
}
