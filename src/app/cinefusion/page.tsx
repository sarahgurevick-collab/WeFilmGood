import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";

/**
 * CinéFusion : encore un concept, pas un jeu construit. Il vit pour
 * l'instant comme une entrée du menu, deux couleurs qui se répondent —
 * le rouge WeFilmGood et celui des trois engagements qui tournent.
 */
export default async function CinefusionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <PageShell eyebrow="À venir" title="CinéFusion" enTeteAnime connecte={!!user}>
      <p className={formStyles.hint}>
        Provoquer le hasard cinématographique. Le jeu n&apos;est pas encore
        construit — revenez bientôt.
      </p>
    </PageShell>
  );
}
