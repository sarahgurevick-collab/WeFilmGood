import GrilleInclineeCannes from "@/components/GrilleInclineeCannes";
import PageShell from "@/components/PageShell";
import PanelFestivals from "@/components/PanelFestivals";
import { SELECTIONS_CANNES } from "@/data/selectionsCannes";
import { SELECTIONS_PCDV } from "@/data/selectionsPCDV";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

const FESTIVALS = [
  { id: "cannes", label: "Cannes", selections: SELECTIONS_CANNES },
  {
    id: "pcdv",
    label: "Paris Courts Devant",
    selections: SELECTIONS_PCDV,
  },
];

export default async function FestivalsResidencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PageShell
      eyebrow="WeFilmGood"
      title="Festivals & Résidences"
      theme="clair"
      wide
      enTeteAnime
      connecte={!!user}
    >
      <p className={styles.intro}>
        Les festivals et résidences partenaires, année après année : les
        projets sélectionnés par la Maison des Scénaristes et WeFilmGood pour
        pitcher devant les professionnels du secteur.
      </p>

      <div className={styles.layout}>
        <GrilleInclineeCannes />
        <PanelFestivals festivals={FESTIVALS} />
      </div>
    </PageShell>
  );
}
