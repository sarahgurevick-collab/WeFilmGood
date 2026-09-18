import AvantageAdhesion from "@/components/AvantageAdhesion";
import PageShell from "@/components/PageShell";
import SelecteurAdhesion from "@/components/SelecteurAdhesion";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export default async function AdhesionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PageShell eyebrow="WeFilmGood" title="Adhésion" enTeteAnime connecte={!!user}>
      <SelecteurAdhesion
        contenus={[
          <ul key="0" className={styles.avantages}>
            <AvantageAdhesion icone="loupe">
              La Pitchothèque et le Finder — pour savoir combien de projets
              répondent à vos envies.
            </AvantageAdhesion>
            <AvantageAdhesion icone="oeil">
              1 projet / mois (random)
            </AvantageAdhesion>
          </ul>,

          <ul key="50" className={styles.avantages}>
            <AvantageAdhesion icone="loupe">
              La Pitchothèque et le Finder — pour savoir combien de projets
              répondent à vos envies.
            </AvantageAdhesion>
            <AvantageAdhesion icone="oeil">
              1 projet / mois (random)
            </AvantageAdhesion>
            <AvantageAdhesion icone="nuage">1 projet</AvantageAdhesion>
            <AvantageAdhesion icone="oeil">
              5 projets par mois (random)
            </AvantageAdhesion>
          </ul>,

          <ul key="500" className={styles.avantages}>
            <AvantageAdhesion icone="loupe">
              La Pitchothèque et le Finder — pour savoir combien de projets
              répondent à vos envies.
            </AvantageAdhesion>
            <AvantageAdhesion icone="nuage">11 dépôts</AvantageAdhesion>
            <AvantageAdhesion>
              Fiches projets illimité et accompagnement vidéopitch pour
              toutes vos fiches projets
            </AvantageAdhesion>
            <AvantageAdhesion icone="oeil">
              5 projets par semaine. Possibilité d&apos;utiliser le crédit à
              votre convenance
            </AvantageAdhesion>
            <AvantageAdhesion icone="telephone">
              Un rendez-vous visio ou téléphonique pour répondre à vos
              besoins particuliers
            </AvantageAdhesion>
          </ul>,

          "Contenu à venir pour le sur-mesure.",
        ]}
      />
    </PageShell>
  );
}
