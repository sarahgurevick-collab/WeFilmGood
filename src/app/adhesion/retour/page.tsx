import Link from "next/link";
import { redirect } from "next/navigation";
import FeuArtifice from "@/components/FeuArtifice";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { verifierAdhesion } from "@/lib/adhesion-paiement";
import { createClient } from "@/lib/supabase/server";
import styles from "./retour.module.css";

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

  if (etat === "active") {
    // Relue après la vérification : la date d'échéance vient d'être posée.
    const { data: a } = await supabase
      .from("memberships")
      .select("expires_at, membership_plans(label)")
      .eq("id", m.id)
      .maybeSingle();
    const offre = (a?.membership_plans as { label?: string } | null)?.label;
    const echeance = a?.expires_at
      ? new Date(a.expires_at).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

    return (
      <PageShell theme="clair" connecte>
        <section className={styles.bravo}>
          <div className={styles.pastille}>
            <FeuArtifice />
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <p className={styles.eyebrow}>Adhésion</p>
          <h1 className={styles.titre}>
            Merci, votre adhésion est <span className={styles.rouge}>active</span>
          </h1>
          <p className={styles.texte}>
            Votre paiement est bien reçu. Un email de confirmation vous a été envoyé.
          </p>
          {(offre || echeance) && (
            <dl className={styles.carte}>
              {offre && (
                <div>
                  <dt>Formule</dt>
                  <dd>{offre}</dd>
                </div>
              )}
              {echeance && (
                <div>
                  <dt>Valable jusqu&apos;au</dt>
                  <dd>{echeance}</dd>
                </div>
              )}
            </dl>
          )}
          <Link href="/pitchotheque" className={formStyles.submit}>
            Aller à la pitchothèque
          </Link>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Adhésion" title="Paiement en cours de vérification" theme="clair" connecte>
      {erreur ? (
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
        <Link href="/adhesion">Retour à l&apos;adhésion</Link>
      </p>
    </PageShell>
  );
}
