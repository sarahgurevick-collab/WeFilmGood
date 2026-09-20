import formStyles from "./form.module.css";
import styles from "./EtatDeLecture.module.css";

/**
 * « Où en est mon projet ? » — ce que l'auteur voit de l'avancement.
 *
 * Trois états, et rien d'autre : les refus, les réattributions et les
 * 48 heures laissées à chaque lecteur pour accepter ne le regardent pas.
 * Un projet décliné par trois lecteurs affiche le même état qu'un projet
 * confié du premier coup — c'est exact, et c'est tout ce qui le concerne.
 *
 * Cette page existe pour qu'il se renseigne sans écrire : sur WFG 1, un
 * e-mail partait à chaque changement de lecteur, et l'auteur, ne
 * comprenant pas, écrivait à l'administration.
 */
export type Etat = "attribution" | "en_lecture" | "disponible";

const ETAPES: { cle: Etat; titre: string; texte: string }[] = [
  {
    cle: "attribution",
    titre: "Projet reçu",
    texte: "Votre projet est enregistré. Un lecteur va en être chargé.",
  },
  {
    cle: "en_lecture",
    titre: "Analyse en cours",
    texte: "Un lecteur professionnel lit votre scénario et rédige son analyse.",
  },
  {
    cle: "disponible",
    titre: "Analyse disponible",
    texte: "Votre fiche de lecture est prête.",
  },
];

export default function EtatDeLecture({
  etat,
  deposeLe,
}: {
  etat: Etat;
  deposeLe: string | null;
}) {
  const position = ETAPES.findIndex((e) => e.cle === etat);
  const jours = deposeLe
    ? Math.floor((Date.now() - new Date(deposeLe).getTime()) / 86400000)
    : null;

  return (
    <div className={styles.bloc}>
      <h2 className={styles.titre}>Où en est votre projet</h2>

      <ol className={styles.etapes}>
        {ETAPES.map((e, i) => (
          <li
            key={e.cle}
            className={
              i < position ? styles.faite : i === position ? styles.encours : styles.avenir
            }
          >
            <span className={styles.puce} aria-hidden="true" />
            <div>
              <strong>{e.titre}</strong>
              {i === position && <p className={styles.texte}>{e.texte}</p>}
            </div>
          </li>
        ))}
      </ol>

      {deposeLe && (
        <p className={formStyles.hint}>
          Reçu le{" "}
          {new Date(deposeLe).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          {jours !== null && jours > 0 && `, il y a ${jours} jour${jours > 1 ? "s" : ""}`}.
          {etat !== "disponible" &&
            " Les analyses sont rendues en une dizaine de jours en moyenne."}
        </p>
      )}
    </div>
  );
}
