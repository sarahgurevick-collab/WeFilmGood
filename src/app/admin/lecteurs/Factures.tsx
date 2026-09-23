import Link from "next/link";
import formStyles from "@/components/form.module.css";
import adminStyles from "../admin.module.css";
import { payerFacture } from "./actions";

export type FactureLecteur = {
  id: string;
  numero: string;
  date: string;
  lecteur: string | null;
  lecteurId: string;
  fiches: number;
  montant: number;
  payee: boolean;
};

/** Les factures établies par les lecteurs, avec le bouton qui les solde. */
export default function Factures({
  factures,
  retour,
  avecLecteur,
}: {
  factures: FactureLecteur[];
  retour: string;
  avecLecteur: boolean;
}) {
  if (factures.length === 0) {
    return <p className={formStyles.hint}>Aucune facture.</p>;
  }
  return (
    <table className={adminStyles.table}>
      <thead>
        <tr>
          <th>Facture</th>
          {avecLecteur && <th>Lecteur</th>}
          <th>Établie le</th>
          <th>Fiches</th>
          <th>Montant</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {factures.map((f) => (
          <tr key={f.id}>
            <td>
              <Link href={`/lecteur/factures/${f.id}`} target="_blank">
                {f.numero}
              </Link>
            </td>
            {avecLecteur && (
              <td>
                <Link href={`/admin/lecteurs/${f.lecteurId}`}>
                  {f.lecteur ?? "—"}
                </Link>
              </td>
            )}
            <td>{new Date(f.date).toLocaleDateString("fr-FR")}</td>
            <td>{f.fiches}</td>
            <td>
              {f.montant.toLocaleString("fr-FR", {
                style: "currency",
                currency: "EUR",
              })}
            </td>
            <td>
              {f.payee ? (
                "✓ Payée"
              ) : (
                <form action={payerFacture}>
                  <input type="hidden" name="facture" value={f.id} />
                  <input type="hidden" name="retour" value={retour} />
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
  );
}

type FactureBrute = {
  id: string;
  numero: string;
  tarif_cents: number;
  created_at: string;
  reader_id: string;
  // Selon la relation, la base rend un objet ou une liste d'un élément.
  lecteur: { full_name: string | null } | { full_name: string | null }[] | null;
  fiches: { payment_status: string }[];
};

export const SELECTION_FACTURES =
  "id, numero, tarif_cents, created_at, reader_id, lecteur:profiles!reader_invoices_reader_id_fkey(full_name), fiches:reading_reports(payment_status)";

/** Met en forme les factures lues avec SELECTION_FACTURES. */
export function versFactures(brutes: FactureBrute[] | null): FactureLecteur[] {
  return (brutes ?? []).map((f) => ({
    id: f.id,
    numero: f.numero,
    date: f.created_at,
    lecteur:
      (Array.isArray(f.lecteur) ? f.lecteur[0] : f.lecteur)?.full_name ?? null,
    lecteurId: f.reader_id,
    fiches: f.fiches.length,
    montant: (f.fiches.length * f.tarif_cents) / 100,
    payee:
      f.fiches.length > 0 &&
      f.fiches.every((l) => l.payment_status === "payee"),
  }));
}
