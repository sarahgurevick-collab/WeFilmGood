import Link from "next/link";
import BarreNav from "@/components/BarreNav";
import AnneauChiffres from "@/components/AnneauChiffres";
import GalerieSucces from "@/components/GalerieSucces";
import CielEtoile from "@/components/CielEtoile";
import DefilementEngagements from "@/components/DefilementEngagements";
import EnTeteAnime from "@/components/EnTeteAnime";
import FeuArtificeAuPassage from "@/components/FeuArtificeAuPassage";
import GalaxieAccueil from "@/components/GalaxieAccueil";
import HashSession from "@/components/HashSession";
import NuageAccueil from "@/components/NuageAccueil";
import SpherePhotos, { type PhotoSphereItem } from "@/components/SpherePhotos";
import { SUCCESS_STORIES_BLOG } from "@/data/successStoriesBlog";
import { chiffresAccueil } from "@/lib/chiffres-accueil";
import { chargerProjetOrbite } from "@/lib/orbite";
import { createClient } from "@/lib/supabase/server";
import formStyles from "@/components/form.module.css";
import styles from "./page.module.css";
import { photoNette } from "@/lib/photo";

const STATUT = { signe: "Signé", tourne: "Tourné" } as const;
const DIAPOS_SUCCES = SUCCESS_STORIES_BLOG.map((s) => ({
  titre: s.titre,
  auteur: s.auteur,
  affiche: s.affiche,
  sousTitre: [s.format === "LM" ? "Long métrage" : "Court métrage", s.statut ? STATUT[s.statut] : null]
    .filter(Boolean)
    .join(" · "),
  image: s.image,
}));

export default async function Home() {
  const supabase = await createClient();

  // Les projets ne sont plus lisibles sans compte : les totaux passent
  // par une fonction dédiée, qui ne renvoie que des nombres.
  const [{ data: fonds }, { data: auth }, projetOrbite, { data: temoignages }, chiffres] = await Promise.all([
    supabase.rpc("compter_fonds"),
    supabase.auth.getUser(),
    chargerProjetOrbite(),
    // Les témoignages publics (vue temoignages_publics, migration 0023),
    // lisibles sans compte : la sphère des « 10 ans » sous la galaxie.
    supabase
      .from("temoignages_publics")
      .select("id, avatar_url, testimonial")
      .returns<{ id: string; avatar_url: string | null; testimonial: string | null }[]>(),
    chiffresAccueil(),
  ]);
  const photosTemoignages: PhotoSphereItem[] = (temoignages ?? []).map((t) => ({
    id: t.id,
    src: photoNette(t.avatar_url),
    // Témoignages anonymes (04/11, Sarah) : la photo reste, le nom ne quitte plus le serveur.
    alt: "Membre WeFilmGood",
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
        {/* Essai du 04/11 (Sarah) : la galerie qui défile, films tournés en affiche,
            projets signés en 16/9. Avant : le carrousel « glass » (CarrouselVerre,
            étiquette accueil-avant-galerie), et encore avant CarrouselSucces. */}
        <GalerieSucces films={DIAPOS_SUCCES} />
      </section>

      <section className={`${styles.bande} clair`}>
        <h2 className={styles.bandeTitre}>
          Rejoignez <span className={styles.rouge}>We</span>Film<span className={styles.rouge}>Good</span> la
          plateforme de la Maison des Scénaristes
        </h2>
        <p className={styles.bandeSousTitre}>
          Créons ensemble les Films et les Séries de demain !
        </p>

        {/* Les chiffres de l'accueil de WFG 1 (13/11, Sarah) : l'anneau des
            talents par métier, les autres chiffres en nombres autour. Les
            libellés sont ceux de WFG 1 ; « Contrats signés » = projets au
            bandeau Signé ou Tourné. Avant : étiquette accueil-avant-anneau. */}
        {chiffres && (
          <AnneauChiffres
            total={chiffres.talents}
            libelleTotal="Talents"
            parts={[
              { label: "Scénaristes", n: chiffres.metiers.scenariste ?? 0 },
              { label: "Réalisateurs", n: chiffres.metiers.realisateur ?? 0 },
              { label: "Producteurs", n: chiffres.metiers.producteur ?? 0 },
              { label: "Comédiens", n: chiffres.metiers.comedien ?? 0 },
              { label: "Compositeurs", n: chiffres.metiers.compositeur ?? 0 },
            ]}
            compteurs={[
              { label: "Scénarios analysés", n: chiffres.fiches },
              { label: "Projets labellisés", n: chiffres.labellises },
              { label: "Pays connectés", n: chiffres.pays },
              { label: "Contrats signés", n: chiffres.signes },
            ]}
          />
        )}

        <div className={styles.bandeFinder}>
          <NuageAccueil total={totalMotsCles} />
        </div>
      </section>

      {/* ESSAI : les quatre engagements en défilement horizontal. */}
      <DefilementEngagements />

    </>
  );
}
