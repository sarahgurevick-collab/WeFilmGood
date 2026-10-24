import formStyles from "@/components/form.module.css";
import { commenterCineCrush, retirerMonCommentaire } from "./actions";
import styles from "./cinecrush.module.css";

export type Avis = {
  id: string;
  parent_id: string | null;
  auteur_id: string;
  contenu: string;
  statut: string;
  cree_le: string;
  auteur: { full_name: string | null } | null;
};

const quand = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

/**
 * Les avis sous le videopitch : tout membre connecté écrit, signé de son
 * prénom et de son nom ; l'auteur du projet répond (en rouge) ; chacun peut
 * retirer le sien. Un commentaire mis de côté par le filtre n'est visible
 * que de son auteur, en pointillé, le temps que l'administration tranche.
 */
export default function Commentaires({
  cinecrushId,
  auteurProjetId,
  moi,
  avis,
  erreur,
  attente,
}: {
  cinecrushId: string;
  auteurProjetId: string;
  moi: string;
  avis: Avis[];
  erreur?: string;
  attente?: boolean;
}) {
  const racines = avis.filter((a) => !a.parent_id);
  const reponsesDe = (id: string) => avis.filter((a) => a.parent_id === id);

  const Formulaire = ({ parentId }: { parentId?: string }) => (
    <form action={commenterCineCrush} className={styles.formulaire}>
      <input type="hidden" name="cinecrush_id" value={cinecrushId} />
      {parentId && <input type="hidden" name="parent_id" value={parentId} />}
      <textarea
        name="contenu"
        maxLength={2000}
        required
        placeholder={parentId ? "Votre réponse" : "Votre avis sur ce videopitch"}
        aria-label={parentId ? "Votre réponse" : "Votre avis"}
      />
      <button type="submit" className={styles.envoyer}>
        {parentId ? "Répondre" : "Publier mon avis"}
      </button>
    </form>
  );

  const Un = ({ a, reponse = false }: { a: Avis; reponse?: boolean }) => {
    const estAuteurProjet = a.auteur_id === auteurProjetId;
    const estMoi = a.auteur_id === moi;
    const enAttente = a.statut === "en_attente";
    return (
      <li
        className={`${styles.avis} ${estAuteurProjet ? styles.avisAuteurProjet : ""} ${enAttente ? styles.enAttente : ""}`}
      >
        <p className={styles.qui}>
          <strong>{a.auteur?.full_name ?? "Un membre"}</strong>
          {estAuteurProjet ? " · l'auteur du projet" : ""} · {quand(a.cree_le)}
          {enAttente ? " · en attente de relecture, visible de vous seul" : ""}
        </p>
        <p className={styles.texte}>{a.contenu}</p>
        <div className={styles.gestes}>
          {!reponse && !enAttente && (
            <details className={styles.repondre}>
              <summary>Répondre</summary>
              <Formulaire parentId={a.id} />
            </details>
          )}
          {estMoi && (
            <form action={retirerMonCommentaire}>
              <input type="hidden" name="id" value={a.id} />
              <button type="submit">Retirer</button>
            </form>
          )}
        </div>
        {!reponse && reponsesDe(a.id).length > 0 && (
          <ul className={styles.reponses}>
            {reponsesDe(a.id).map((r) => (
              <Un key={r.id} a={r} reponse />
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <section id="commentaires" className={styles.commentaires}>
      <h2>Les avis{racines.length ? ` (${avis.filter((a) => a.statut === "publie").length})` : ""}</h2>
      {erreur === "vide" && <p className={formStyles.error}>Écrivez quelque chose avant de publier.</p>}
      {erreur === "semaine" && (
        <p className={formStyles.error}>Ce CinéCrush n&apos;est plus celui de la semaine : les avis sont fermés.</p>
      )}
      {attente && (
        <p className={formStyles.hint}>
          Votre avis a été mis de côté pour relecture par l&apos;équipe ; il paraîtra une fois relu.
        </p>
      )}
      <Formulaire />
      {racines.length === 0 ? (
        <p className={formStyles.hint}>Pas encore d&apos;avis : le premier est à vous.</p>
      ) : (
        <ul className={styles.liste}>
          {racines.map((a) => (
            <Un key={a.id} a={a} />
          ))}
        </ul>
      )}
    </section>
  );
}
