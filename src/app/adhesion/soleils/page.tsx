import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { verifierAchatSoleils } from "@/lib/soleils-paiement";
import { createClient } from "@/lib/supabase/server";

/**
 * Retour de HelloAsso après l'achat d'un Pack Soleils (16/11/2026) : on
 * relit le paiement, puis on dit combien de soleils sont ajoutés et
 * combien il en reste.
 */
export default async function RetourSoleilsPage({
  searchParams,
}: {
  searchParams: Promise<{ achat?: string; erreur?: string }>;
}) {
  const { achat: achatId, erreur } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/adhesion");
  if (!achatId) redirect("/adhesion");

  const { data: achat } = await supabase
    .from("soleils_achats")
    .select("id, nombre")
    .eq("id", achatId)
    .eq("profile_id", user.id)
    .maybeSingle<{ id: string; nombre: number }>();
  if (!achat) redirect("/adhesion");

  let etat: "payee" | "en_attente" | "introuvable" = "en_attente";
  if (!erreur) {
    try {
      etat = await verifierAchatSoleils(achat.id);
    } catch (e) {
      console.error("retour soleils", achat.id, e);
    }
  }
  const { data: restants } = await supabase.rpc("soleils_pack_restants");

  if (etat === "payee") {
    return (
      <PageShell eyebrow="Pack Soleils" title="Merci, vos soleils sont arrivés" connecte>
        <p className={formStyles.hint}>
          {achat.nombre} soleils ont été ajoutés. Il vous en reste {restants ?? achat.nombre} pour ouvrir
          les projets de votre choix.
        </p>
        <p style={{ marginTop: 24 }}>
          <Link href="/galaxies" className={formStyles.submit}>
            Aller aux Galaxies
          </Link>
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Pack Soleils" title="Paiement en cours de vérification" connecte>
      <p className={formStyles.hint}>
        {erreur
          ? "Le paiement n’a pas abouti. Rien n’a été débité. Vous pouvez réessayer depuis la page d’adhésion."
          : "HelloAsso ne nous a pas encore confirmé votre paiement. Cela prend parfois quelques minutes : vos soleils seront ajoutés tout seuls."}
      </p>
      <p className={formStyles.linkRow} style={{ marginTop: 24 }}>
        <Link href="/adhesion">Retour à l’adhésion</Link>
      </p>
    </PageShell>
  );
}
