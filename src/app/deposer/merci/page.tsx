import Link from "next/link";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";

export default function MerciPage() {
  return (
    <PageShell eyebrow="Dépôt de projet" title="Projet bien reçu">
      <p className={formStyles.hint}>
        Votre scénario entre en lecture. Vous serez prévenu par email de son
        évolution.
      </p>
      <p className={formStyles.linkRow} style={{ marginTop: 24 }}>
        <Link href="/">Retour à l&apos;accueil</Link>
      </p>
    </PageShell>
  );
}
