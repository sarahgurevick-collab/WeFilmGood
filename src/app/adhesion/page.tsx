import AvantageAdhesion from "@/components/AvantageAdhesion";
import BoutonDevis from "@/components/BoutonDevis";
import ChoixCredits from "@/components/ChoixCredits";
import PageShell from "@/components/PageShell";
import SelecteurAdhesion from "@/components/SelecteurAdhesion";
import formStyles from "@/components/form.module.css";
import { modeHelloAsso } from "@/lib/helloasso";
import { createClient } from "@/lib/supabase/server";
import { adherer } from "./actions";
import styles from "./page.module.css";

export default async function AdhesionPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string }>;
}) {
  const { paiement } = await searchParams;
  const supabase = await createClient();
  const [{ data: { user } }, { data: fonds }, { data: estAdmin }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("compter_fonds"),
    supabase.rpc("is_admin"),
  ]);

  // En mode test (compte HelloAsso de test), le bouton n'apparaît qu'à
  // l'administration : personne d'autre ne paie avec une fausse carte.
  const test = modeHelloAsso() === "sandbox";
  const peutPayer = !test || estAdmin === true;
  const bouton = (plan: string, montant: string) =>
    peutPayer ? (
      <form action={adherer}>
        <input type="hidden" name="plan" value={plan} />
        <button type="submit" className={formStyles.submit}>
          Adhérer — {montant}
        </button>
        {test && (
          <p className={formStyles.hint} style={{ marginTop: 8 }}>
            Mode test : paiement sur le compte HelloAsso de test, avec une fausse carte. Visible de
            l&apos;administration seulement.
          </p>
        )}
      </form>
    ) : null;
  const motsCles =
    ((fonds ?? [])[0] as { mots_cles: number } | undefined)?.mots_cles ?? 0;

  return (
    <PageShell eyebrow="WeFilmGood" title="Adhésion" enTeteAnime connecte={!!user}>
      {paiement === "erreur" && (
        <p className={formStyles.error}>
          Le paiement n&apos;a pas pu démarrer. Réessayez dans un instant, ou écrivez-nous.
        </p>
      )}
      {paiement === "bientot" && (
        <p className={formStyles.hint}>Le paiement en ligne ouvre très bientôt.</p>
      )}
      <SelecteurAdhesion
        achats={[null, null, bouton("palier_50", "50 €"), bouton("palier_500", "500 €"), null]}
        notePaiement={
          <p style={{ margin: 0 }}>
            <strong>Le paiement passe par HelloAsso</strong>, la plateforme de paiement des
            associations. Elle ne prend aucune commission à la Maison des Scénaristes : elle vit
            des contributions volontaires de celles et ceux qui paient. Au moment de régler,
            HelloAsso vous propose donc d&apos;ajouter une contribution pour son propre
            fonctionnement, déjà remplie. Elle est facultative : vous pouvez la modifier ou la
            mettre à zéro avant de valider. Elle ne revient pas à WeFilmGood.
          </p>
        }
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
            <AvantageAdhesion>
              Jeu Ciné-Fusion : provoquer le hasard cinématographique.
            </AvantageAdhesion>
          </ul>,

          <p key="5" style={{ margin: 0 }}>Contenu à venir.</p>,

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

          <div key="devis">
            <p style={{ margin: "0 0 16px" }}>
              Une formule sur mesure, pour une société de production, une école, un festival ou
              un besoin particulier. Dites-nous ce que vous cherchez, on vous répond avec un
              devis.
            </p>
            <BoutonDevis />
          </div>,
        ]}
      />
    </PageShell>
  );
}
