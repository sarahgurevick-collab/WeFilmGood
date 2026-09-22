import AvantageAdhesion from "@/components/AvantageAdhesion";
import ChoixCredits from "@/components/ChoixCredits";
import PageShell from "@/components/PageShell";
import SelecteurAdhesion from "@/components/SelecteurAdhesion";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export default async function AdhesionPage() {
  const supabase = await createClient();
  const [{ data: { user } }, { data: fonds }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("compter_fonds"),
  ]);
  const motsCles =
    ((fonds ?? [])[0] as { mots_cles: number } | undefined)?.mots_cles ?? 0;

  return (
    <PageShell eyebrow="WeFilmGood" title="Adhésion" enTeteAnime connecte={!!user}>
      <SelecteurAdhesion
        contenus={[
          <ul key="0" className={styles.avantages}>
            <AvantageAdhesion icone="loupe">
              La Pitchothèque et le Finder — pour savoir combien de projets
              répondent à vos envies.
            </AvantageAdhesion>
            <AvantageAdhesion icone="motscles">
              Le nuage de mots-clés — les {motsCles.toLocaleString("fr-FR")} thèmes
              portés par les projets, avec leurs chiffres, à ouvrir aussi large
              que vous voulez
            </AvantageAdhesion>
            <AvantageAdhesion icone="oeil">Focus de la semaine : 1 projet à découvrir</AvantageAdhesion>
          </ul>,

          <ul key="50" className={styles.avantages}>
            <AvantageAdhesion icone="loupe">
              La Pitchothèque et le Finder — pour savoir combien de projets
              répondent à vos envies.
            </AvantageAdhesion>
            <AvantageAdhesion icone="motscles">
              Le nuage de mots-clés — les {motsCles.toLocaleString("fr-FR")} thèmes
              portés par les projets, avec leurs chiffres, à ouvrir aussi large
              que vous voulez
            </AvantageAdhesion>
            <AvantageAdhesion icone="oeil">Focus de la semaine : 1 projet à découvrir</AvantageAdhesion>
            <li>
              <ChoixCredits />
            </li>
            <AvantageAdhesion>
              10 fiches projets (sans analyse du document PDF)
            </AvantageAdhesion>
          </ul>,

          <ul key="500" className={styles.avantages}>
            <AvantageAdhesion icone="loupe">
              La Pitchothèque et le Finder — pour savoir combien de projets
              répondent à vos envies.
            </AvantageAdhesion>
            <AvantageAdhesion icone="motscles">
              Le nuage de mots-clés — les {motsCles.toLocaleString("fr-FR")} thèmes
              portés par les projets, avec leurs chiffres, à ouvrir aussi large
              que vous voulez
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
