import type { CSSProperties } from "react";
import Link from "next/link";
import BarreNav from "@/components/BarreNav";
import CarrouselSucces from "@/components/CarrouselSucces";
import Compteur from "@/components/Compteur";
import DefilementEngagements from "@/components/DefilementEngagements";
import EnTeteAnime from "@/components/EnTeteAnime";
import HashSession from "@/components/HashSession";
import NuageAccueil from "@/components/NuageAccueil";
import RechercheAccueil from "@/components/RechercheAccueil";
import LogoComplet from "@/components/LogoComplet";
import PitchWall, { type Pitch } from "@/components/PitchWall";
import { SUCCESS_STORIES } from "@/data/successStories";
import { createClient } from "@/lib/supabase/server";
import formStyles from "@/components/form.module.css";
import styles from "./page.module.css";

const DOTS = [0, 45, 90, 135, 180, 225, 270, 315];

export default async function Home() {
  const supabase = await createClient();

  // Tant que la table n'existe pas, `error` est renseigné et la page
  // s'affiche avec les aplats : rien ne casse.
  const { data } = await supabase
    .from("pitches")
    .select("id, vimeo_id, title")
    .eq("is_featured", true)
    .order("position", { ascending: true })
    .limit(25);

  const pitches: Pitch[] = data ?? [];

  // Les projets ne sont plus lisibles sans compte : les totaux passent
  // par une fonction dédiée, qui ne renvoie que des nombres.
  const [{ data: fonds }, { data: auth }] = await Promise.all([
    supabase.rpc("compter_fonds"),
    supabase.auth.getUser(),
  ]);
  const { projets: count = 0, mots_cles: totalMotsCles = 0 } =
    ((fonds ?? [])[0] as { projets: number; mots_cles: number } | undefined) ?? {};

  return (
    <>
      <HashSession />
      <EnTeteAnime connecte={!!auth?.user} />
      <PitchWall pitches={pitches} />

      <div className={styles.mobile}>
        <LogoComplet hauteur={52} />
        <p className={styles.mobileSignature}>
          The best stories wherever they are
        </p>
        {count ? (
          <p className={styles.mobileCompte}>
            {count} projet{count > 1 ? "s" : ""} dans la pitchothèque
          </p>
        ) : null}
        <Link href="/pitchotheque" className={styles.mobileBouton}>
          Voir les projets
        </Link>
      </div>

      <div className={styles.barreNavMobileSeule}>
        <BarreNav connecte={!!auth?.user} />
      </div>

      <div className={styles.ui}>
        <div className={`${styles.corner} ${styles.topLeft}`}>
          <div>WeFilmGood</div>
          <div>2026</div>
        </div>

        <div className={styles.loader} aria-hidden="true">
          {DOTS.map((a, i) => (
            <i
              key={a}
              style={{ "--a": `${a}deg`, "--ad": `${i * 0.2}s` } as CSSProperties}
            />
          ))}
        </div>

        <div className={styles.hero}>
          <Compteur valeur={10} label="ans" feuArtifice />
        </div>

        <div className={styles.statsBar}>
          <Compteur valeur={9170} label="Scénarios analysés" />
          <Compteur valeur={1325} label="Projets labellisés" />
          <Compteur valeur={135} label="Pays connectés" />
          <Compteur valeur={13058} label="talents" />
        </div>
      </div>

      <div className={styles.heroSpace} aria-hidden="true" />

      <section className={`${styles.bande} clair`}>
        <h2 className={styles.bandeTitre}>
          Rejoignez <span className={styles.rouge}>We</span>Film<span className={styles.rouge}>Good</span> la
          plateforme de la Maison des Scénaristes
        </h2>
        <p className={styles.bandeSousTitre}>
          Créons ensemble les Films et les Séries de demain !
        </p>

        <div className={styles.bandeFinder}>
          <RechercheAccueil />
          <NuageAccueil total={totalMotsCles} />
        </div>
      </section>

      {/* ESSAI : les quatre engagements en défilement horizontal. */}
      <DefilementEngagements />

      <section className={styles.stories}>
        <h2 className={styles.storiesTitre}>Success stories</h2>
        <CarrouselSucces diapos={SUCCESS_STORIES} />
        <Link href="/succes" className={formStyles.submit}>
          Voir tous les films
        </Link>
      </section>
    </>
  );
}
