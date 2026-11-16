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

  // Le bouton « Acheter » du Pack Soleils se pose dans la colonne de son prix (16/11).
  const { data: adherent } = user
    ? await supabase.rpc("a_une_adhesion_active", { p_profile_id: user.id })
    : { data: false };

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
      {/* « Mes factures » est passé dans « Réglages du compte » (15/11, Sarah). */}
      {/* Le bouton « Aller aux Galaxies » des adhérents est retiré (15/11, Sarah) :
          la carte à 0 € porte « J'explore les Galaxies ». */}
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
      <OrbiteAdhesion motsCles={motsCles} connecte={!!user} adherent={adherent === true} />
    </PageShell>
  );
}
