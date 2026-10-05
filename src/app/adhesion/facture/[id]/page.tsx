import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { renseignerFacture } from "./actions";
import styles from "./facture.module.css";

type Facture = {
  id: string;
  numero: string;
  amount_cents: number;
  issued_at: string;
  profile_id: string;
  bill_to_name: string | null;
  bill_to_address: string | null;
  bill_to_siren: string | null;
  note: string | null;
  membership: { started_at: string | null; expires_at: string | null } | null;
};

const jour = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/**
 * La facture d'une adhésion, émise automatiquement au paiement, prête à
 * imprimer ou à enregistrer en PDF. Son titulaire peut y faire figurer sa
 * société, son adresse et son SIREN.
 */
export default async function FactureAdhesionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/adhesion/facture/${id}`);

  const { data: facture } = await supabase
    .from("membership_invoices")
    .select(
      "id, numero, amount_cents, issued_at, profile_id, bill_to_name, bill_to_address, bill_to_siren, note, membership:memberships(started_at, expires_at)",
    )
    .eq("id", id)
    .maybeSingle<Facture>();
  if (!facture) notFound();

  const { data: profil } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", facture.profile_id)
    .maybeSingle<{ full_name: string | null }>();

  const nom = facture.bill_to_name ?? profil?.full_name ?? "—";
  const euros = (facture.amount_cents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 });
  const debut = facture.membership?.started_at;
  const fin = facture.membership?.expires_at;

  return (
    <PageShell eyebrow="Adhésion" title={`Facture ${facture.numero}`} theme="clair">
      <div className={styles.entete}>
        <div>
          <strong>La Maison des Scénaristes</strong>
          <br />
          Association loi 1901
          <br />
          33 avenue Laplace
          <br />
          94110 Arcueil
          <br />
          SIREN 539 745 471 · SIRET 539 745 471 00018
        </div>
        <div className={styles.destinataire}>
          <span className={formStyles.hint}>Facturé à</span>
          <br />
          <strong>{nom}</strong>
          {facture.bill_to_address && (
            <>
              <br />
              <span style={{ whiteSpace: "pre-line" }}>{facture.bill_to_address}</span>
            </>
          )}
          {facture.bill_to_siren && (
            <>
              <br />
              SIREN {facture.bill_to_siren}
            </>
          )}
        </div>
      </div>

      <p className={formStyles.hint}>Établie le {jour(facture.issued_at)}. Payée en ligne par HelloAsso.</p>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Désignation</th>
            <th className={styles.nombre}>Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              Adhésion annuelle WeFilmGood
              {debut && fin ? ` — du ${jour(debut)} au ${jour(fin)}` : ""}
            </td>
            <td className={styles.nombre}>{euros} €</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>
              <strong>Total à payer : 0,00 € — déjà réglé</strong>
            </td>
            <td className={styles.nombre}>
              <strong>{euros} €</strong>
            </td>
          </tr>
        </tfoot>
      </table>

      {facture.note && <p className={styles.note}>{facture.note}</p>}

      <p className={styles.mentions}>
        TVA non applicable, article 293 B du CGI.
      </p>

      <div className={styles.horsImpression}>
        <form action={renseignerFacture}>
          <input type="hidden" name="facture_id" value={facture.id} />
          <label className={formStyles.field}>
            <span>Nom ou société à facturer</span>
            <input type="text" name="nom" defaultValue={facture.bill_to_name ?? profil?.full_name ?? ""} />
          </label>
          <label className={formStyles.field}>
            <span>Adresse (facultatif)</span>
            <textarea name="adresse" rows={3} defaultValue={facture.bill_to_address ?? ""} />
          </label>
          <label className={formStyles.field}>
            <span>SIREN de la société (facultatif)</span>
            <input type="text" name="siren" defaultValue={facture.bill_to_siren ?? ""} />
          </label>
          <label className={formStyles.field}>
            <span>Complément d&apos;information (facultatif)</span>
            <textarea name="note" rows={2} defaultValue={facture.note ?? ""} />
          </label>
          <span className={formStyles.hint}>
            Enregistrez avant d&apos;imprimer : ces informations figureront sur la facture.
          </span>
          <button type="submit" className={formStyles.submit}>
            Enregistrer
          </button>
        </form>

        <p className={formStyles.hint} style={{ marginTop: 20 }}>
          Pour obtenir le PDF : imprimez cette page et choisissez
          «&nbsp;Enregistrer au format PDF&nbsp;» comme destination.
        </p>
      </div>
    </PageShell>
  );
}
