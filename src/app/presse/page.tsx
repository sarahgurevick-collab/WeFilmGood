import PageShell from "@/components/PageShell";
import PresseLecteur from "@/components/PresseLecteur";
import { ARTICLES_PRESSE } from "@/data/presse";
import { createClient } from "@/lib/supabase/server";

/**
 * Les articles sur la Maison des Scénaristes et WeFilmGood (26/11/2026,
 * Sarah) : présentés comme les masterclass. Le titre reprend celui de
 * l'étage presse de la page de la Maison.
 */
export default async function PressePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Le plus récent en premier.
  const articles = [...ARTICLES_PRESSE].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <PageShell title="Ils parlent de nous" enTeteAnime connecte={!!user}>
      <PresseLecteur articles={articles} />
    </PageShell>
  );
}
