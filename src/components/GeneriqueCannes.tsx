import { SELECTIONS_CANNES } from "@/data/selectionsCannes";
import styles from "./GeneriqueCannes.module.css";

function Contenu({ dupliquat }: { dupliquat?: boolean }) {
  return (
    <div aria-hidden={dupliquat || undefined}>
      {SELECTIONS_CANNES.map((annee) => (
        <div key={annee.annee} className={styles.annee}>
          <h3 className={styles.anneeTitre}>Cannes {annee.annee}</h3>
          {annee.blocs.map((bloc, i) => (
            <div key={i} className={styles.bloc}>
              <p className={styles.blocTitre}>{bloc.titre}</p>
              <ul className={styles.liste}>
                {bloc.entrees.map((entree, j) => (
                  <li key={j}>{entree}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Générique défilant (façon générique de fin) des sélections "Pitchs sans frontières" à Cannes, année après année. */
export default function GeneriqueCannes() {
  return (
    <div className={styles.cadre}>
      <div className={styles.colonne}>
        <Contenu />
        <Contenu dupliquat />
      </div>
    </div>
  );
}
