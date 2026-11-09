import Link from "next/link";
import { redirect } from "next/navigation";
import FeuArtifice from "@/components/FeuArtifice";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import styles from "@/app/adhesion/retour/retour.module.css";
import { verifierDemandeLecture } from "@/lib/lecture-paiement";
import { createClient } from "@/lib/supabase/server";

/**
 * Le retour de HelloAsso après le paiement des 50 € de la lecture. On ne
 * croit pas l'adresse (n'importe qui peut la taper) : on relit le
 * paiement chez HelloAsso, comme pour l'adhésion.
 */
export default async function RetourLecturePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demande?: string; erreur?: string }>;
}) {
  const { id } = await params;
  const { demande, erreur } = await searchParams;
  const documents = `/projet/${id}/documents`;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=${documents}`);
  if (!demande) redirect(documents);

  // La règle d'accès ne laisse voir que ses propres demandes.
  const { data: d } = await supabase
    .from("lecture_demandes")
    .select("id, projects(title)")
    .eq("id", demande)
    .eq("project_id", id)
    .maybeSingle();
  if (!d) redirect(documents);
  const titre = (d.projects as { title?: string } | null)?.title;

  let etat: "payee" | "en_attente" | "introuvable" = "en_attente";
  try {
    etat = await verifierDemandeLecture(d.id);
  } catch (e) {
    console.error("retour HelloAsso (lecture)", e);
  }

  if (etat === "payee") {
    return (
      <PageShell theme="clair" connecte>
        <section className={styles.bravo}>
          <div className={styles.pastille}>
            <FeuArtifice />
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
          <p className={styles.eyebrow}>Lecture</p>
          <h1 className={styles.titre}>
            Merci, votre projet est <span className={styles.rouge}>envoyé</span>
          </h1>
          <p className={styles.texte}>
            Votre paiement est bien reçu.{titre ? ` « ${titre} » ` : " Votre projet "}
            va être confié à un lecteur.
          </p>
          <Link href={`/projet/${id}`} className={formStyles.submit}>
            Voir ma fiche
          </Link>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Lecture" title="Paiement en cours de vérification" theme="clair" connecte>
      {erreur ? (
        <p className={formStyles.hint}>
          Le paiement n&apos;a pas abouti. Rien n&apos;a été débité. Vous pouvez réessayer depuis
          l&apos;onglet « Documents » de votre fiche.
        </p>
      ) : (
        <p className={formStyles.hint}>
          HelloAsso ne nous a pas encore confirmé votre paiement. Cela prend parfois quelques
          minutes : votre projet sera envoyé à la lecture tout seul.
        </p>
      )}
      <p className={formStyles.linkRow} style={{ marginTop: 24 }}>
        <Link href={documents}>Retour aux documents</Link>
      </p>
    </PageShell>
  );
}
