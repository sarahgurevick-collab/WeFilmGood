/**
 * Les sélections de la Maison des Scénaristes, posées depuis la fiche
 * projet (24/10/2026, Sarah) : l'administration seule les voit et les
 * modifie. Jusque-là, seul le tableau des fiches de lecture (/admin/fiches)
 * le permettait. Même geste ici : « Retirer » en toutes lettres à côté de
 * chaque sélection, un champ pour en ajouter une (les libellés déjà
 * connus sont proposés en tapant).
 */
import formStyles from "@/components/form.module.css";
import { modifierSelection } from "./actions";
import styles from "./selections-admin.module.css";

export default function SelectionsAdmin({
  projectId,
  selections,
  connues,
}: {
  projectId: string;
  selections: string[];
  connues: string[];
}) {
  return (
    <div className={styles.bloc}>
      <p className={styles.titre}>
        Sélections de la Maison des Scénaristes
        <span className={formStyles.hint}> (administration)</span>
      </p>
      {selections.length === 0 && <p className={formStyles.hint}>Aucune pour ce projet.</p>}
      {selections.map((libelle) => (
        <form key={libelle} action={modifierSelection} className={styles.ligne}>
          <input type="hidden" name="project_id" value={projectId} />
          <input type="hidden" name="libelle" value={libelle} />
          <input type="hidden" name="geste" value="retirer" />
          <span>{libelle}</span>
          <button type="submit" className={styles.retirer} aria-label={`Retirer ${libelle}`}>
            Retirer
          </button>
        </form>
      ))}
      <form action={modifierSelection} className={styles.ligne}>
        <input type="hidden" name="project_id" value={projectId} />
        <input
          type="text"
          name="libelle"
          list="selections-connues"
          placeholder="Cannes 2026"
          maxLength={80}
          className={styles.saisie}
          aria-label="Ajouter une sélection"
        />
        <button type="submit" className={styles.ajouter}>
          Ajouter
        </button>
        <datalist id="selections-connues">
          {connues.map((x) => (
            <option key={x} value={x} />
          ))}
        </datalist>
      </form>
    </div>
  );
}
