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
