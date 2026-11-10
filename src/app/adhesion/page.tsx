import Link from "next/link";
import OrbiteAdhesion from "@/components/OrbiteAdhesion";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";

export default async function AdhesionPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string }>;
}) {
  const { paiement } = await searchParams;
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: fonds },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("compter_fonds"),
  ]);

  // Les factures de l'adhérent, émises automatiquement à chaque paiement.
  const { data: factures } = user
    ? await supabase
        .from("membership_invoices")
        .select("id, numero, issued_at")
        .order("issued_at", { ascending: false })
        .returns<{ id: string; numero: string; issued_at: string }[]>()
    : { data: null };
  // Un adhérent actif qui arrive ici (par l'email de confirmation, par
  // exemple) est invité à aller voir les Galaxies.
  const { count: adhesionsActives } = user
    ? await supabase
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
    : { count: 0 };
  const motsCles =
    ((fonds ?? [])[0] as { mots_cles: number } | undefined)?.mots_cles ?? 0;

  return (
    <PageShell
      eyebrow="WeFilmGood"
      title={
        <>
          Adhésion à la Galaxie We<span style={{ color: "#DA2C25" }}>Film</span>
          Good
        </>
      }
      enTeteAnime
      connecte={!!user}
    >
      {(factures ?? []).length > 0 && (
        <p className={formStyles.hint} style={{ marginBottom: 12 }}>
          Mes factures :{" "}
          {(factures ?? []).map((f, i) => (
            <span key={f.id}>
              {i > 0 && " · "}
              <a href={`/adhesion/facture/${f.id}`}>
                {f.numero} ({new Date(f.issued_at).toLocaleDateString("fr-FR")})
              </a>
            </span>
          ))}
        </p>
      )}
      {(adhesionsActives ?? 0) > 0 && (
        <p style={{ margin: "16px 0 24px" }}>
          <Link
            href="/galaxies"
            className={formStyles.submit}
            style={{ display: "inline-block" }}
          >
            Aller aux Galaxies
          </Link>
        </p>
      )}
      {paiement === "erreur" && (
        <p className={formStyles.error}>
          Le paiement n&apos;a pas pu démarrer. Réessayez dans un instant, ou
          écrivez-nous.
        </p>
      )}
      {paiement === "bientot" && (
        <p className={formStyles.hint}>
          Le paiement en ligne ouvre très bientôt.
        </p>
      )}
      {/* L'adhésion en orbite, avant le détail des paliers (05/10, idée de Sarah). */}
      <OrbiteAdhesion motsCles={motsCles} />
    </PageShell>
  );
}
