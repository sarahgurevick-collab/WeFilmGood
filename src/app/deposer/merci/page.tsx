import Link from "next/link";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";

export default function MerciPage() {
  return (
    <PageShell eyebrow="Fiche projet" title="Votre fiche projet est créée">
      <p className={formStyles.hint}>
        Elle est enregistrée. Vous pouvez la compléter ou la modifier à tout moment depuis
        la page de votre projet.
      </p>
      <p className={formStyles.linkRow} style={{ marginTop: 24 }}>
        <Link href="/">Retour à l&apos;accueil</Link>
      </p>
    </PageShell>
  );
}
