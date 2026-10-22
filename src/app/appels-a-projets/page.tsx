import FriseAppels from "@/components/FriseAppels";
import PageShell from "@/components/PageShell";
import SwitchFormat from "@/components/SwitchFormat";
import { createClient } from "@/lib/supabase/server";
import { APPELS } from "./appels";
import styles from "./page.module.css";

/*
 * ESSAI (22/10/2026) — la page s'ouvre sur la frise des appels à projets
 * (dates limites et logos des festivals en évidence). Le texte de l'appel,
 * qui change peu d'une édition à l'autre, est derrière un bouton : court
 * métrage ou long métrage. Les lecteurs ont leur bouton aussi, du même
 * style que partout sur le site (22/10). Page d'avant : étiquette git
 * « appels-a-projets-avant-frise ».
 */

/* Le texte de l'appel, repris de la page d'avant sans les noms de festivals
   ni les dates, qui sont désormais sur la frise. */
function TexteAppel() {
  return (
    <SwitchFormat
      defaut="long"
      contenuCourt={
        <>
          <div className={styles.logos}>
            <img
              src="/festivals/clermont-ferrand.jpg"
              alt="Festival International du Court Métrage de Clermont-Ferrand"
              className={styles.logoRond}
            />
          </div>
          <h3>Appel à projets court métrage</h3>
          <p>
            La Maison des Scénaristes et WeFilmGood, en partenariat avec le
            festival, organisent des rencontres auteurs-producteurs pendant
            le festival. Les auteurs sélectionnés rencontrent des producteurs
            lors de rendez-vous individuels.
          </p>

          <h3>Modalités de candidature</h3>
          <ol>
            <li>
              <strong>Écrire un scénario</strong> : créez un scénario de
              court métrage original, en français ou en anglais, sans
              restriction de sujet.
            </li>
            <li>
              <strong>Déposer sur la plateforme</strong> : inscrivez-vous
              sur WeFilmGood.com et déposez votre scénario sous forme de
              continuité dialoguée. Vous pouvez joindre une note
              d&apos;intention ou un moodboard. Tous les documents doivent
              être des PDF anonymes et seront répartis aléatoirement entre
              les lecteurs pour une double évaluation minimum.
            </li>
            <li>
              <strong>Pitch vidéo</strong> : envoyez un pitch vidéo d&apos;1
              minute 30 maximum, en français et/ou en anglais (moins de
              100 Mo). Il doit s&apos;agir d&apos;un plan unique, sans
              montage ni effets spéciaux, où vous présentez votre projet
              face caméra. À envoyer à contact@wefilmgood.com.
            </li>
          </ol>

          <h3>Processus de sélection</h3>
          <p>
            WeFilmGood établit une présélection de projets
            &laquo;&nbsp;labellisés&nbsp;&raquo;, les auteurs sont prévenus
            par email. Une sélection finale détermine quels projets
            participent aux rencontres auteurs-producteurs du festival. Les
            projets non retenus pour le festival restent accessibles aux
            producteurs en ligne sur la plateforme.
          </p>

          <h3>Ce que la plateforme vous apporte</h3>
          <p>
            Accès à près de 2 000 producteurs internationaux, retour de
            lecture constructif sous 15 jours, visibilité du projet pendant
            un an, adhésion de 30 € à la Maison des Scénaristes incluse. Les
            frais de candidature de 50 € couvrent les évaluations des
            lecteurs.
          </p>
          <p>Contact : hello@maisondesscenaristes.org</p>
        </>
      }
      contenuLong={
        <>
          <div className={styles.logos}>
            <img
              src="/festivals/festival-de-cannes.png"
              alt="Festival de Cannes"
              className={styles.logoLarge}
            />
            <img
              src="/festivals/paris-courts-devant.png"
              alt="Paris Courts Devant"
              className={styles.logoRond}
            />
          </div>
          <h3>Appel à pitchs long métrage</h3>
          <p>
            La Maison des Scénaristes et WeFilmGood lancent un appel à
            projets international de longs métrages francophones ou
            anglophones. Il invite les auteurs de toutes nationalités à
            présenter leur projet à des professionnels du secteur. Les
            auteurs sélectionnés pitchent leur projet aux professionnels
            lors d&apos;une présentation en direct.
          </p>

          <h3>Modalités de candidature</h3>
          <ol>
            <li>
              <strong>Dossier du projet</strong> : rédigez un traitement de
              long métrage de 8 à 10 pages ainsi que les 5 premières pages
              du scénario (note d&apos;intention recommandée). Sujet libre,
              en français ou en anglais : fiction, animation ou
              documentaire.
            </li>
            <li>
              <strong>Inscription sur la plateforme</strong> : créez ou
              utilisez votre compte WeFilmGood.com pour déposer votre
              traitement. Le document doit être un PDF anonyme ; vous
              pouvez y ajouter une note d&apos;intention et/ou un
              moodboard. Chaque candidature fait l&apos;objet d&apos;une
              double lecture minimum. Une fois le projet déposé, cliquez
              sur &laquo;&nbsp;Soumettre à la sélection et aux appels à
              projets&nbsp;&raquo; pour participer automatiquement à
              l&apos;appel à projets en cours.
            </li>
            <li>
              <strong>Pitch vidéo</strong> : envoyez un pitch vidéo en
              français et/ou en anglais (2 minutes 30 maximum, moins de
              100 Mo). Il doit s&apos;agir d&apos;un plan unique, sans
              montage ni effets spéciaux, où vous présentez votre projet
              face caméra. À envoyer à contact@wefilmgood.com.
            </li>
          </ol>

          <h3>Processus de sélection</h3>
          <p>
            WeFilmGood établit une présélection de projets
            &laquo;&nbsp;labellisés&nbsp;&raquo;, les auteurs sont prévenus
            par email. Une sélection finale détermine quels projets
            participent aux pitchs du festival ; elle est annoncée sur les
            réseaux sociaux et le site de la Maison des Scénaristes. Les
            projets non retenus pour le festival restent accessibles aux
            producteurs en ligne sur la plateforme.
          </p>

          <h3>Ce que la plateforme vous apporte</h3>
          <p>
            Accès à près de 2 000 producteurs internationaux, retour de
            lecture constructif sous 15 jours, visibilité du projet pendant
            un an, adhésion de 30 € à la Maison des Scénaristes incluse.
            Les frais de candidature de 50 € couvrent exclusivement le
            dédommagement des lecteurs.
          </p>
          <p>Contact : hello@maisondesscenaristes.org</p>
        </>
      }
    />
  );
}

function TexteLecteurs() {
  return (
    <>
      <h3>En savoir plus sur nos lecteurs</h3>
      <p>
        Les lecteurs sont les piliers de la Maison des Scénaristes depuis
        5 ans. Ils sont également lecteurs pour la plateforme WeFilmGood.
        Ils sont scénaristes, réalisateurs avec une grande expérience de
        la dramaturgie et une réelle envie de découvrir de nouvelles
        histoires. Ils sont aussi extrêmement conscients des réalités du
        marché.
      </p>
      <p>
        Les lecteurs de WeFilmGood ont été retenus pour leurs aptitudes
        d&apos;évaluation d&apos;un scénario et leurs capacités à pouvoir
        formuler les besoins de réécriture pour l&apos;amélioration
        d&apos;un projet. Chaque lecteur reçoit aléatoirement et
        confidentiellement un projet via la plateforme. Il fait un retour
        précis et constructif sur le projet dans un délai de 15 jours
        sous forme de fiche de lecture motivée.
      </p>
      <p>
        Les bonnes histoires sont rares, voilà pourquoi nous allons les
        chercher partout où elles se trouvent. Si la majorité des
        lecteurs de WFG sont européens, la plateforme dispose d&apos;au
        moins un lecteur qui lit pour nous dans chaque continent. Sans
        cette sensibilité multiculturelle propre à nos lecteurs, ces
        récits resteraient dans l&apos;ombre et ne pourraient être
        proposés sur la plateforme WFG.
      </p>
      <p>
        Notre sélection assure à la filière de production, des projets
        aux qualités dramatiques fortes, servant des récits originaux.
        Elle permet à tous les partenaires de voir leurs démarches
        soutenues par un socle narratif solide.
      </p>
    </>
  );
}

export default async function AppelsAProjetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const appels = [...APPELS].sort((a, b) =>
    a.dateLimite.localeCompare(b.dateLimite),
  );

  return (
    <PageShell theme="clair" enTeteAnime connecte={!!user}>
      <FriseAppels
        appels={appels}
        aujourdHui={aujourdHui}
        titre="Nos appels à projets"
        feuilles={[
          { libelle: "Appel à projet en cours", contenu: <TexteAppel /> },
          { libelle: "En savoir plus sur nos lecteurs", contenu: <TexteLecteurs /> },
        ]}
      />
    </PageShell>
  );
}
