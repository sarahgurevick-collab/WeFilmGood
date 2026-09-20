import { revenirAMonCompte } from "@/app/admin/profils/prise-de-place";
import styles from "./BandeauIncarnation.module.css";

/**
 * Rappel permanent que l'administration agit à la place d'un membre.
 *
 * Sans lui, on oublie, et on écrit au nom de quelqu'un d'autre sans s'en
 * rendre compte : tout ce qui est fait ici est enregistré au nom du
 * membre, pas de l'administration.
 */
export default function BandeauIncarnation() {
  return (
    <div className={styles.bandeau} role="status">
      <span>
        Vous agissez à la place d&apos;un membre. Tout ce que vous faites est
        enregistré en son nom.
      </span>
      <form action={revenirAMonCompte}>
        <button type="submit" className={styles.retour}>
          Revenir à mon compte
        </button>
      </form>
    </div>
  );
}
