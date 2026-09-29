import Link from "next/link";
import BarreNav from "@/components/BarreNav";
import CarrouselSucces from "@/components/CarrouselSucces";
import DefilementEngagements from "@/components/DefilementEngagements";
import EnTeteAnime from "@/components/EnTeteAnime";
import GalaxieAccueil from "@/components/GalaxieAccueil";
import HashSession from "@/components/HashSession";
import NuageAccueil from "@/components/NuageAccueil";
import { SUCCESS_STORIES } from "@/data/successStories";
import { chargerProjetOrbite } from "@/lib/orbite";
import { createClient } from "@/lib/supabase/server";
import formStyles from "@/components/form.module.css";
import styles from "./page.module.css";

export default async function Home() {
  const supabase = await createClient();

  // Les projets ne sont plus lisibles sans compte : les totaux passent
  // par une fonction dédiée, qui ne renvoie que des nombres.
  const [{ data: fonds }, { data: auth }, projetOrbite] = await Promise.all([
    supabase.rpc("compter_fonds"),
    supabase.auth.getUser(),
    chargerProjetOrbite(),
  ]);
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

      {/* La barre au pouce, sur téléphone : pour les membres seulement. Un
          visiteur n'a que l'accueil, et le bouton de connexion en haut. */}
      {auth?.user && (
        <div className={styles.barreNavMobileSeule}>
          <BarreNav connecte />
        </div>
      )}

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
    </>
  );
}
