import formStyles from "@/components/form.module.css";
import PageShell from "@/components/PageShell";
import { createClient } from "@/lib/supabase/server";

export default async function AppelsAProjetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PageShell
      eyebrow="WeFilmGood"
      title="Nos appels à projets"
      enTeteAnime
      connecte={!!user}
    >
      <p className={formStyles.hint}>Contenu à venir.</p>
    </PageShell>
  );
}
