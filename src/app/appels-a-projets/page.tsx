import PageShell from "@/components/PageShell";
import SwitchFormat from "@/components/SwitchFormat";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export default async function AppelsAProjetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PageShell theme="clair" enTeteAnime connecte={!!user}>
      <div className={styles.entete}>
        <h1 className={styles.sousTitre}>Prochain appel à projets</h1>
        <img
          src="/festivals/paris-courts-devant.jpg"
          alt="Paris Courts Devant"
          className={styles.logoFestival}
        />
      </div>
      <SwitchFormat
        contenuCourt={
          <>
            <h3>Festival de Clermont-Ferrand 2026 — appel à projets (édition précédente, à mettre à jour)</h3>
            <p>
              La Maison des Scénaristes et WeFilmGood, en partenariat avec le
              48e Festival International du Court Métrage de
              Clermont-Ferrand, organisent des rencontres auteurs-producteurs
              pendant le festival 2026. Les auteurs sélectionnés rencontrent
              des producteurs lors de rendez-vous individuels.
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
            <p>
              <strong>Date limite :</strong> 8 novembre 2025 à 23h59 (heure
              française)
            </p>

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
              Accès à plus de 1 900 producteurs internationaux, retour de
              lecture constructif sous 10 jours, visibilité du projet
              pendant un an, adhésion de 30 € à la Maison des Scénaristes
              incluse. Les frais de candidature de 50 € couvrent les
              évaluations des lecteurs.
            </p>
            <p>Contact : hello@maisondesscenaristes.org</p>
          </>
        }
        contenuLong={
          <>
            <h3>Paris Courts Devant 2027 — appel à pitchs long métrage</h3>
            <p>
              Cet appel à projets long métrage francophone est organisé par
              la Maison des Scénaristes et WeFilmGood. Il invite les auteurs
              de toutes nationalités à présenter leur projet à des
              professionnels du secteur.
            </p>
            <p>
              <strong>Date limite :</strong> 25 octobre 2026
            </p>

            <h3>Modalités de candidature</h3>
            <ol>
              <li>
                <strong>Dossier du projet</strong> : préparez un traitement
                de 8 à 10 pages ainsi que les 5 premières pages du scénario.
                Les projets de fiction, d&apos;animation ou documentaire sont
                acceptés, en français ou en anglais.
              </li>
              <li>
                <strong>Inscription sur la plateforme</strong> : créez ou
                utilisez votre compte WeFilmGood.com pour déposer vos
                documents. Le document doit être un PDF anonyme. Chaque
                candidature fait l&apos;objet d&apos;une double lecture
                minimum.
              </li>
              <li>
                <strong>Pitch vidéo</strong> : envoyez un pitch vidéo en
                français (2 minutes 30 maximum, moins de 100 Mo). La vidéo
                doit vous montrer en train de présenter le projet face
                caméra, sans montage ni effets.
              </li>
            </ol>

            <h3>Ce que la plateforme vous apporte</h3>
            <p>
              Les participants accèdent à environ 2 022 producteurs
              internationaux inscrits sur la plateforme. Les frais de
              candidature de 50 € permettent d&apos;obtenir un retour de
              lecture écrit sous 15 jours. Même les projets non retenus pour
              le festival restent visibles en ligne auprès des producteurs.
            </p>
            <p>Contact : hello@maisondesscenaristes.org</p>
          </>
        }
      />
    </PageShell>
  );
}
