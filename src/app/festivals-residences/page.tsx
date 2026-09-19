import GrilleInclineeCannes from "@/components/GrilleInclineeCannes";
import PageShell from "@/components/PageShell";
import { SELECTIONS_CANNES } from "@/data/selectionsCannes";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export default async function FestivalsResidencesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PageShell
      eyebrow="WeFilmGood"
      title="Festivals & Résidences"
      theme="clair"
      wide
      enTeteAnime
      connecte={!!user}
    >
      <p className={styles.intro}>
        Le Festival de Cannes, année après année : les projets sélectionnés
        par la Maison des Scénaristes et WeFilmGood pour pitcher devant les
        professionnels du secteur.
      </p>

      <GrilleInclineeCannes />

      <div className={styles.panelAuteurs}>
        {SELECTIONS_CANNES.map((annee) => (
          <section key={annee.annee} className={styles.annee}>
            <h2 className={styles.anneeTitre}>Cannes {annee.annee}</h2>

            {annee.blocs.map((bloc, i) => (
              <div key={i} className={styles.bloc}>
                <h3 className={styles.blocTitre}>{bloc.titre}</h3>
                <ul className={styles.liste}>
                  {bloc.entrees.map((entree, j) => (
                    <li key={j}>{entree}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>
    </PageShell>
  );
}
