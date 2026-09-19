import PageShell from "@/components/PageShell";
import SectionFestivals from "@/components/SectionFestivals";
import { SELECTIONS_CANNES } from "@/data/selectionsCannes";
import { SELECTIONS_CLERMONT_FERRAND } from "@/data/selectionsClermontFerrand";
import { SELECTIONS_PCDV } from "@/data/selectionsPCDV";
import { createClient } from "@/lib/supabase/server";

const FESTIVALS = [
  { id: "cannes", label: "Cannes", selections: SELECTIONS_CANNES },
  { id: "pcdv", label: "Paris Courts Devant", selections: SELECTIONS_PCDV },
  {
    id: "clermont-ferrand",
    label: "Clermont-Ferrand",
    selections: SELECTIONS_CLERMONT_FERRAND,
  },
  { id: "serie-mania", label: "Série Mania", selections: [] },
  { id: "valence", label: "Valence", selections: [] },
  {
    id: "maison-bleue",
    label: 'Résidence d\'écriture "La Maison Bleue"',
    selections: [],
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
      <SectionFestivals festivals={FESTIVALS} />
    </PageShell>
  );
}
