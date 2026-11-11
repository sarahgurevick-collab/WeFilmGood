import formStyles from "@/components/form.module.css";
import CielEtoile from "@/components/CielEtoile";
import PageShell from "@/components/PageShell";
import SpherePhotos, { type PhotoSphereItem } from "@/components/SpherePhotos";
import { createClient } from "@/lib/supabase/server";
import { photoNette } from "@/lib/photo";

type Temoignage = {
  id: string;
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
  // Tous les témoignages (14/10, Sarah, après un essai « producteurs
  // seulement » le même jour : avec la sphère refaite, les 171 passent).
  const { data } = await supabase
    .from("temoignages_publics")
    .select("id, avatar_url, testimonial");

  const temoignages: Temoignage[] = data ?? [];

  const photos: PhotoSphereItem[] = temoignages.map((t) => ({
    id: t.id,
    src: photoNette(t.avatar_url),
    // Témoignages anonymes (04/11, Sarah) : la photo reste, le nom ne quitte plus le serveur.
    alt: "Membre WeFilmGood",
    description: t.testimonial ?? undefined,
  }));

  return (
    <PageShell
      eyebrow="WeFilmGood"
      title="Témoignages"
      // Essai sur fond noir (14/10, Sarah) ; avant : theme="clair".
      enTeteAnime
      connecte={!!user}
    >
      {photos.length === 0 ? (
        <p className={formStyles.hint}>Contenu à venir.</p>
      ) : (
        // Le ciel (étoiles, comète) derrière la sphère (14/10, Sarah).
        <div style={{ position: "relative" }}>
          <CielEtoile />
          <div style={{ position: "relative", zIndex: 1 }}>
            <SpherePhotos photos={photos} />
          </div>
        </div>
      )}
    </PageShell>
  );
}
