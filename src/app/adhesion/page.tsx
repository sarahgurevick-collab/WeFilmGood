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

/** Le petit œil barré, dans le texte : ce qui n'est pas visible à 0 €. */
function OeilBarre() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ verticalAlign: "-2px" }}
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

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

  // Les lignes communes à tous les paliers, après les trois galaxies.
  const suite = (
    <>
      <AvantageAdhesion icone="loupe">
        La barre de Recherche — pour savoir combien de projets répondent à vos envies.
      </AvantageAdhesion>
      <AvantageAdhesion icone="motscles">
        Le nuage de mots-clés — les {motsCles.toLocaleString("fr-FR")} thèmes
        portés par les projets, avec leurs chiffres, à ouvrir aussi large
        que vous voulez
      </AvantageAdhesion>
      <AvantageAdhesion icone="oeil">Focus de la semaine : 1 projet à découvrir</AvantageAdhesion>
      <AvantageAdhesion icone="coeur">
        Jeu CinéCrush : provoquer le hasard cinématographique.
      </AvantageAdhesion>
    </>
  );

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
            <AvantageAdhesion icone="projets">
              La Galaxie de Projets (<OeilBarre /> videopitch non visible)
            </AvantageAdhesion>
            <AvantageAdhesion icone="talents">
              La Galaxie de Talents (<OeilBarre /> noms et photo non visibles)
            </AvantageAdhesion>
            <AvantageAdhesion icone="personnages">La Galaxie de Personnages</AvantageAdhesion>
            {suite}
          </ul>,

          // Le 5 € par mois : la même adhésion que le 50 € par an (02/10).
          <ul key="5" className={styles.avantages}>
            <AvantageAdhesion icone="projets">
              La Galaxie de Projets (<OeilBarre /> videopitch non visible)
            </AvantageAdhesion>
            <AvantageAdhesion icone="talents">
              La Galaxie de Talents (<OeilBarre /> noms et photo non visibles)
            </AvantageAdhesion>
            <AvantageAdhesion icone="personnages">La Galaxie de Personnages</AvantageAdhesion>
            {suite}
            <AvantageAdhesion icone="loupe">
              5 crédits / semaine à choisir dans la Galaxie Projets, Talents, Personnages (non
              cumulables)
            </AvantageAdhesion>
            <AvantageAdhesion icone="fiole">
              Le ScénarioLab offert, place prioritaire (limité à 50 places)
            </AvantageAdhesion>
            <AvantageAdhesion>
              Adhésion pour 1 an, sans annulation possible avant 12 mois
            </AvantageAdhesion>
          </ul>,

          <ul key="50" className={styles.avantages}>
            <AvantageAdhesion icone="projets">
              La Galaxie de Projets (<OeilBarre /> videopitch non visible)
            </AvantageAdhesion>
            <AvantageAdhesion icone="talents">
              La Galaxie de Talents (<OeilBarre /> noms et photo non visibles)
            </AvantageAdhesion>
            <AvantageAdhesion icone="personnages">La Galaxie de Personnages</AvantageAdhesion>
            {suite}
            <ChoixCredits
              lignesDepot={
                <>
                  <AvantageAdhesion icone="nuage">
                    L&apos;analyse d&apos;un projet de long métrage, court métrage, série ou VR/360,
                    selon les modalités de dépôt.
                  </AvantageAdhesion>
                  <AvantageAdhesion icone="projets">
                    Création de fiches projets (sans analyse du document PDF / 10 maximum)
                  </AvantageAdhesion>
                </>
              }
              lignesAcces={
                <>
                  <AvantageAdhesion icone="loupe">
                    5 crédits / semaine à choisir dans la Galaxie Projets, Talents, Personnages
                    (non cumulables)
                  </AvantageAdhesion>
                  <AvantageAdhesion icone="loupe">
                    Les 5 crédits ne sont pas cumulables : s&apos;ils ne sont pas utilisés, ils ne
                    peuvent pas être récupérés la semaine suivante.
                  </AvantageAdhesion>
                </>
              }
            />
            <AvantageAdhesion icone="fiole">
              Le ScénarioLab offert, place prioritaire (limité à 50 places)
            </AvantageAdhesion>
            <AvantageAdhesion>
              Adhésion pour 1 an, sans annulation possible avant 12 mois
            </AvantageAdhesion>
            <AvantageAdhesion>2 mois offerts</AvantageAdhesion>
          </ul>,

          <ul key="500" className={styles.avantages}>
            <AvantageAdhesion icone="projets">
              La Galaxie de Projets (<OeilBarre /> videopitch non visible)
            </AvantageAdhesion>
            <AvantageAdhesion icone="talents">
              La Galaxie de Talents (<OeilBarre /> noms et photo non visibles)
            </AvantageAdhesion>
            <AvantageAdhesion icone="personnages">La Galaxie de Personnages</AvantageAdhesion>
            {suite}
            <ChoixCredits
              lignesDepot={
                <>
                  <AvantageAdhesion icone="nuage">
                    Au choix 11 projets analysés (1 gratuit)
                  </AvantageAdhesion>
                  <AvantageAdhesion>
                    Un accompagnement longue durée sur un projet en particulier
                  </AvantageAdhesion>
                </>
              }
              lignesAcces={
                <AvantageAdhesion icone="oeil">
                  5 projets par semaine. Possibilité d&apos;utiliser le crédit à
                  votre convenance
                </AvantageAdhesion>
              }
            />
            <AvantageAdhesion>
              Fiches projets illimité et accompagnement vidéopitch pour
              toutes vos fiches projets
            </AvantageAdhesion>
            <AvantageAdhesion icone="telephone">
              Un rendez-vous visio ou téléphonique pour répondre à vos
              besoins particuliers
            </AvantageAdhesion>
            <AvantageAdhesion icone="fiole">Le ScénarioLab offert, limité à 50 places</AvantageAdhesion>
            <AvantageAdhesion>
              Adhésion pour 1 an, sans annulation possible avant 12 mois
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

      {/* L'achat à l'unité, sans adhésion : à part des paliers, pour ne pas
          le confondre avec l'adhésion à 5 € par mois (02/10, mots de Sarah). */}
      <section className={styles.unite}>
        <h2 className={styles.uniteTitre}>Service supplémentaire à 5 €</h2>
        <ul className={styles.avantages}>
          <AvantageAdhesion icone="projets">
            1 projet à l&apos;unité, pour un talent qui ne souhaite pas adhérer
          </AvantageAdhesion>
          <AvantageAdhesion>
            L&apos;enregistrement d&apos;1 videopitch pour 1 projet, pour un comédien
          </AvantageAdhesion>
          <AvantageAdhesion icone="fiole">1 place à un ScénarioLab</AvantageAdhesion>
        </ul>
      </section>
    </PageShell>
  );
}
