import formStyles from "@/components/form.module.css";
import PageShell from "@/components/PageShell";
import SpherePhotos, { type PhotoSphereItem } from "@/components/SpherePhotos";
import { createClient } from "@/lib/supabase/server";

type Temoignage = {
  id: string;
  nom: string | null;
  avatar_url: string | null;
  testimonial: string | null;
};

export default async function TemoignagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Vue publique (migration 0023) : uniquement les profils qui ont coché
  // testimonial_is_public, visible sans être connecté (comme sur la v1).
  const { data } = await supabase
    .from("temoignages_publics")
    .select("id, nom, avatar_url, testimonial");

  const temoignages: Temoignage[] = data ?? [];

  const photos: PhotoSphereItem[] = temoignages.map((t) => ({
    id: t.id,
    src: t.avatar_url,
    alt: t.nom ?? "Membre WeFilmGood",
    titre: t.nom ?? undefined,
    description: t.testimonial ?? undefined,
  }));

  return (
    <PageShell
      eyebrow="WeFilmGood"
      title="Témoignages"
      theme="clair"
      enTeteAnime
      connecte={!!user}
    >
      {photos.length === 0 ? (
        <p className={formStyles.hint}>Contenu à venir.</p>
      ) : (
        <SpherePhotos photos={photos} />
      )}
    </PageShell>
  );
}
