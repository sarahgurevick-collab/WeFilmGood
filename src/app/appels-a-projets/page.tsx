import PageShell from "@/components/PageShell";
import SwitchFormat from "@/components/SwitchFormat";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export default async function AppelsAProjetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PageShell
      eyebrow="WeFilmGood"
      title="Nos appels à projets"
      theme="clair"
      enTeteAnime
      connecte={!!user}
    >
      <h2 className={styles.sousTitre}>Prochain appel à projets</h2>
      <SwitchFormat />
    </PageShell>
  );
}
