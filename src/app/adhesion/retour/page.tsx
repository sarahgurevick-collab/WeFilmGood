import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { verifierAdhesion } from "@/lib/adhesion-paiement";
import { createClient } from "@/lib/supabase/server";

/**
 * Le retour de HelloAsso après le paiement. On ne croit pas l'adresse
 * (n'importe qui peut la taper) : on relit le paiement chez HelloAsso.
 */
export default async function RetourPaiementPage({
  searchParams,
}: {
  searchParams: Promise<{ adhesion?: string; erreur?: string }>;
}) {
  const { adhesion, erreur } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/adhesion");
  if (!adhesion) redirect("/adhesion");

  // La règle d'accès ne laisse voir que ses propres adhésions.
  const { data: m } = await supabase
    .from("memberships")
    .select("id")
    .eq("id", adhesion)
    .maybeSingle();
  if (!m) redirect("/adhesion");

  let etat: "active" | "en_attente" | "introuvable" = "en_attente";
  try {
    etat = await verifierAdhesion(m.id);
  } catch (e) {
    console.error("retour HelloAsso", e);
  }

  return (
    <PageShell eyebrow="Adhésion" title={etat === "active" ? "Merci, votre adhésion est active" : "Paiement en cours de vérification"} theme="clair" connecte>
      {etat === "active" ? (
        <p className={formStyles.hint}>
          Votre paiement est bien reçu. Votre adhésion vaut pour un an ; un email de confirmation
          vous a été envoyé.
        </p>
      ) : erreur ? (
        <p className={formStyles.hint}>
          Le paiement n&apos;a pas abouti. Rien n&apos;a été débité. Vous pouvez réessayer depuis
          la page d&apos;adhésion.
        </p>
      ) : (
        <p className={formStyles.hint}>
          HelloAsso ne nous a pas encore confirmé votre paiement. Cela prend parfois quelques
          minutes : votre adhésion s&apos;activera toute seule, et vous recevrez un email.
        </p>
      )}
      <p className={formStyles.linkRow} style={{ marginTop: 24 }}>
        <Link href={etat === "active" ? "/pitchotheque" : "/adhesion"}>
          {etat === "active" ? "Aller à la pitchothèque" : "Retour à l'adhésion"}
        </Link>
      </p>
    </PageShell>
  );
}
