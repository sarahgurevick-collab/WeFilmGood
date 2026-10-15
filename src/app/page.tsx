import Link from "next/link";
import BarreNav from "@/components/BarreNav";
import CarrouselSucces from "@/components/CarrouselSucces";
import CielEtoile from "@/components/CielEtoile";
import DefilementEngagements from "@/components/DefilementEngagements";
import EnTeteAnime from "@/components/EnTeteAnime";
import FeuArtificeAuPassage from "@/components/FeuArtificeAuPassage";
import GalaxieAccueil from "@/components/GalaxieAccueil";
import HashSession from "@/components/HashSession";
import NuageAccueil from "@/components/NuageAccueil";
import SpherePhotos, { type PhotoSphereItem } from "@/components/SpherePhotos";
import { SUCCESS_STORIES } from "@/data/successStories";
import { chargerProjetOrbite } from "@/lib/orbite";
import { createClient } from "@/lib/supabase/server";
import formStyles from "@/components/form.module.css";
import styles from "./page.module.css";

export default async function Home() {
  const supabase = await createClient();

  // Les projets ne sont plus lisibles sans compte : les totaux passent
  // par une fonction dédiée, qui ne renvoie que des nombres.
  const [{ data: fonds }, { data: auth }, projetOrbite, { data: temoignages }] = await Promise.all([
    supabase.rpc("compter_fonds"),
    supabase.auth.getUser(),
    chargerProjetOrbite(),
    // Les témoignages publics (vue temoignages_publics, migration 0023),
    // lisibles sans compte : la sphère des « 10 ans » sous la galaxie.
    supabase
      .from("temoignages_publics")
      .select("id, nom, avatar_url, testimonial")
      .returns<{ id: string; nom: string | null; avatar_url: string | null; testimonial: string | null }[]>(),
  ]);
  const photosTemoignages: PhotoSphereItem[] = (temoignages ?? []).map((t) => ({
    id: t.id,
    src: t.avatar_url,
    alt: t.nom ?? "Membre WeFilmGood",
    titre: t.nom ?? undefined,
    description: t.testimonial ?? undefined,
  }));
  const { mots_cles: totalMotsCles = 0 } =
    ((fonds ?? [])[0] as { projets: number; mots_cles: number } | undefined) ?? {};

  return (
    <>
      <HashSession />
      <EnTeteAnime connecte={!!auth?.user} />
      {/* L'ancien en-tête (mur de pitchs, « 10 ans » et compteurs) est
          remplacé par la galaxie. Le décompte reviendra ailleurs, place
          à décider avec Sarah. */}
      <GalaxieAccueil projet={projetOrbite} />

      {/* Les 10 ans de WeFilmGood (15/10, Sarah) : la page Témoignages posée
          sous la galaxie, avec le feu d'artifice de l'ancien écran d'accueil
          sur le titre, puis la sphère des témoignages devant le ciel étoilé. */}
      <section className={styles.dixAns}>
        <FeuArtificeAuPassage className={styles.dixAnsCadre}>
          <h2 className={styles.dixAnsTitre}>
            We<span className={styles.rouge}>Film</span>Good a 10 ans !
          </h2>
          <p className={styles.dixAnsSousTitre}>Merci pour votre soutien</p>
        </FeuArtificeAuPassage>
        {photosTemoignages.length > 0 && (
          <div className={styles.dixAnsSphere}>
            <CielEtoile />
            <div style={{ position: "relative", zIndex: 1 }}>
              <SpherePhotos photos={photosTemoignages} />
            </div>
          </div>
        )}
      </section>

      {/* La barre au pouce, sur téléphone : pour les membres seulement. Un
          visiteur n'a que l'accueil, et le bouton de connexion en haut. */}
      {auth?.user && (
        <div className={styles.barreNavMobileSeule}>
          <BarreNav connecte />
        </div>
      )}

      {/* Les success stories juste sous la galaxie (14/10, Sarah) : la bande
          noire remonte au-dessus de la bande blanche et des engagements. */}
      <section className={styles.stories}>
        {/* Le titre mène à la liste de tous les films réalisés. */}
        <h2 className={styles.storiesTitre}>
          {/* Le même bouton que partout sur la plateforme (form.module.css). */}
          <Link href="/succes" className={`${formStyles.submit} ${styles.storiesBouton}`}>
            Success stories
          </Link>
        </h2>
        <CarrouselSucces diapos={SUCCESS_STORIES} />
      </section>

      <section className={`${styles.bande} clair`}>
        <h2 className={styles.bandeTitre}>
          Rejoignez <span className={styles.rouge}>We</span>Film<span className={styles.rouge}>Good</span> la
          plateforme de la Maison des Scénaristes
        </h2>
        <p className={styles.bandeSousTitre}>
          Créons ensemble les Films et les Séries de demain !
        </p>

        <div className={styles.bandeFinder}>
          <NuageAccueil total={totalMotsCles} />
        </div>
      </section>

      {/* ESSAI : les quatre engagements en défilement horizontal. */}
      <DefilementEngagements />

    </>
  );
}
