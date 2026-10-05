import Link from "next/link";
import AvantageAdhesion from "@/components/AvantageAdhesion";
import BoutonDevis from "@/components/BoutonDevis";
import OrbiteAdhesion from "@/components/OrbiteAdhesion";
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
  // Les factures de l'adhérent, émises automatiquement à chaque paiement.
  const { data: factures } = user
    ? await supabase
        .from("membership_invoices")
        .select("id, numero, issued_at")
        .order("issued_at", { ascending: false })
        .returns<{ id: string; numero: string; issued_at: string }[]>()
    : { data: null };
  // Un adhérent actif qui arrive ici (par l'email de confirmation, par
  // exemple) est invité à aller voir les Galaxies.
  const { count: adhesionsActives } = user
    ? await supabase
        .from("memberships")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
    : { count: 0 };
  const motsCles =
    ((fonds ?? [])[0] as { mots_cles: number } | undefined)?.mots_cles ?? 0;

  // Les lignes communes à tous les paliers, après les trois galaxies.
  // « Focus de la semaine » s'appelle maintenant CinéCrush (05/10).
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
      <AvantageAdhesion icone="coeur">
        CinéCrush : provoquer le hasard cinématographique.
      </AvantageAdhesion>
    </>
  );

  // L'adhésion, la même au mois (5 €) ou à l'année (50 €) : les mots de Sarah, 04-05/10.
  const adhesion = (
    <>
      <AvantageAdhesion>
        La Galaxie WeFilmGood : 1 crédit par jour pour l&apos;une des 3 galaxies — Projets, Talents, Personnages
      </AvantageAdhesion>
      <AvantageAdhesion icone="oeil">
        Le projet du jour, à découvrir (au hasard, proposé par WeFilmGood)
      </AvantageAdhesion>
      {suite}
      <AvantageAdhesion icone="popcorn">
        CinéMatch : le nom et les réponses de vos matchs (les contacter coûte un crédit)
      </AvantageAdhesion>
      <AvantageAdhesion icone="fiche">
        Fiches projets illimitées (avec le document PDF du projet, sans analyse)
      </AvantageAdhesion>
      <AvantageAdhesion icone="fiche">
        Fiches personnages illimitées, et les talents associés à vos projets, en illimité
      </AvantageAdhesion>
      <AvantageAdhesion icone="camera">
        Un videopitch associé à chaque fiche projet, et l&apos;accompagnement au videopitch si besoin
      </AvantageAdhesion>
      <AvantageAdhesion icone="projets">
        Votre liste de projets aimés : un projet débloqué avec un crédit y reste visible toute
        l&apos;année de l&apos;adhésion
      </AvantageAdhesion>
      <AvantageAdhesion icone="fiole">
        Le ScénarioLab offert, place prioritaire (limité à 50 places)
      </AvantageAdhesion>
      <AvantageAdhesion>
        Adhésion pour 1 an, sans annulation possible avant 12 mois
      </AvantageAdhesion>
    </>
  );

  return (
    <PageShell eyebrow="WeFilmGood" title="Adhésion à la Galaxie WeFilmGood" enTeteAnime connecte={!!user}>
      {(factures ?? []).length > 0 && (
        <p className={formStyles.hint} style={{ marginBottom: 12 }}>
          Mes factures :{" "}
          {(factures ?? []).map((f, i) => (
            <span key={f.id}>
              {i > 0 && " · "}
              <a href={`/adhesion/facture/${f.id}`}>
                {f.numero} ({new Date(f.issued_at).toLocaleDateString("fr-FR")})
              </a>
            </span>
          ))}
        </p>
      )}
      {(adhesionsActives ?? 0) > 0 && (
        <p style={{ margin: "16px 0 24px" }}>
          <Link href="/pitchotheque" className={formStyles.submit} style={{ display: "inline-block" }}>
            Aller aux Galaxies
          </Link>
        </p>
      )}
      {paiement === "erreur" && (
        <p className={formStyles.error}>
          Le paiement n&apos;a pas pu démarrer. Réessayez dans un instant, ou écrivez-nous.
        </p>
      )}
      {paiement === "bientot" && (
        <p className={formStyles.hint}>Le paiement en ligne ouvre très bientôt.</p>
      )}
      {/* L'adhésion en orbite, avant le détail des paliers (05/10, idée de Sarah). */}
      <OrbiteAdhesion />
      <SelecteurAdhesion
        achats={[null, null, bouton("palier_50", "50 €"), null, null]}
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
            <AvantageAdhesion>
              La Galaxie WeFilmGood (accès limité pour les videopitchs et les Talents)
            </AvantageAdhesion>
            {suite}
            <AvantageAdhesion icone="popcorn">
              CinéMatch : 3 matchs à 50 % de réponses similaires, sans le nom ni les réponses
            </AvantageAdhesion>
          </ul>,

          <ul key="5" className={styles.avantages}>
            {adhesion}
          </ul>,

          <ul key="50" className={styles.avantages}>
            {adhesion}
            <AvantageAdhesion>2 mois offerts</AvantageAdhesion>
          </ul>,

          <div key="500">
            <ul className={styles.avantages}>
              <AvantageAdhesion icone="fiole">
                Accompagnement longue durée sur le projet de votre choix (modalités à définir avec
                le Script Doctor)
              </AvantageAdhesion>
              <AvantageAdhesion icone="telephone">
                Un rendez-vous visio ou téléphonique pour répondre à vos besoins particuliers
              </AvantageAdhesion>
            </ul>
            <BoutonDevis />
          </div>,

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

      {/* Les crédits libres : à part de l'adhésion, pour ne pas les confondre
          avec le crédit du jour (04/10, mots de Sarah). */}
      <section className={styles.unite}>
        <h2 className={styles.uniteTitre}>Crédits libres</h2>
        <ul className={styles.avantages}>
          <AvantageAdhesion icone="projets">
            1 crédit = 5 €. Plus on en prend, moins ils coûtent.
          </AvantageAdhesion>
          <AvantageAdhesion icone="oeil">
            Utilisables n&apos;importe quand, contrairement au crédit du jour de l&apos;adhésion.
          </AvantageAdhesion>
          <AvantageAdhesion>
            Un crédit permet de voir un videopitch ; un autre, de contacter un talent ; un autre,
            de trouver un personnage et d&apos;enregistrer un videopitch.
          </AvantageAdhesion>
        </ul>
      </section>

      <section className={styles.unite}>
        <h2 className={styles.uniteTitre}>Services associés</h2>
        <ul className={styles.avantages}>
          <AvantageAdhesion icone="nuage">
            50 € : 1 analyse de document PDF, qui permet d&apos;accéder à la Labellisation du projet.
          </AvantageAdhesion>
          <AvantageAdhesion icone="fiche">
            Labellisation : présence gratuite dans les premières pages de la plateforme, sans
            limite annuelle ; participation à nos 3 appels à projets (Cannes et Paris pour les longs
            métrages, Clermont pour les courts métrages) ; mise en relation selon les demandes
            faites à l&apos;équipe de la Maison des Scénaristes/WFG.
          </AvantageAdhesion>
          <AvantageAdhesion icone="fiole">
            ScénarioLab de 5 personnes : 500 € (100 € par projet participant). Enregistrement et
            mise à disposition de la vidéo avec un lien privé.
          </AvantageAdhesion>
          <AvantageAdhesion icone="fiole">1 place à un ScénarioLab : 5 €</AvantageAdhesion>
          <AvantageAdhesion icone="telephone">
            500 € : accompagnement longue durée sur un projet.
          </AvantageAdhesion>
          <AvantageAdhesion>Sur devis, pour toute autre demande particulière.</AvantageAdhesion>
        </ul>
      </section>
    </PageShell>
  );
}
