import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";

/**
 * CinéFusion : encore un concept, pas un jeu construit. Il vit pour
 * l'instant comme une entrée du menu, deux couleurs qui se répondent —
 * le rouge WeFilmGood et celui des trois engagements qui tournent.
 */
export default function CinefusionPage() {
  return (
    <PageShell eyebrow="À venir" title="CinéFusion">
      <p className={formStyles.hint}>
        Provoquer le hasard cinématographique. Le jeu n&apos;est pas encore
        construit — revenez bientôt.
      </p>
    </PageShell>
  );
}
