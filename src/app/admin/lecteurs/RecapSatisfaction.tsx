import { EMOJIS_SATISFACTION } from "@/lib/satisfaction";
import styles from "./recap.module.css";

/**
 * Combien d'auteurs ont répondu par chaque emoji aux fiches d'un lecteur
 * (04/11/2026, Sarah, d'après une capture en barres) : une barre par emoji,
 * le nombre au-dessus, l'emoji dessous ; les fiches sans réponse à part.
 */
export default function RecapSatisfaction({ notes }: { notes: (number | null | undefined)[] }) {
  const comptes = EMOJIS_SATISFACTION.map((_, i) => notes.filter((n) => n === i + 1).length);
  const sansNote = notes.filter((n) => !n || n < 1 || n > 5).length;
  const max = Math.max(1, ...comptes);
  const total = comptes.reduce((a, b) => a + b, 0);

  return (
    <figure className={styles.recap}>
      <div className={styles.barres} role="list" aria-label="Satisfaction des auteurs">
        {EMOJIS_SATISFACTION.map((emoji, i) => (
          <div
            key={emoji}
            className={styles.colonne}
            role="listitem"
            aria-label={`${emoji} ${i + 1} sur 5 : ${comptes[i]} fiche${comptes[i] > 1 ? "s" : ""}`}
            title={`${comptes[i]} fiche${comptes[i] > 1 ? "s" : ""}${total ? ` (${Math.round((comptes[i] / total) * 100)} %)` : ""}`}
          >
            <span className={styles.nombre}>{comptes[i]}</span>
            <span
              className={`${styles.barre} ${styles[`n${i + 1}`]}`}
              style={{ height: `${Math.max(comptes[i] ? 4 : 0, (comptes[i] / max) * 100)}%` }}
            />
            <span className={styles.emoji} aria-hidden="true">
              {emoji}
            </span>
          </div>
        ))}
      </div>
      <figcaption className={styles.legende}>
        {total} fiche{total > 1 ? "s" : ""} notée{total > 1 ? "s" : ""} par l&apos;auteur · {sansNote} sans réponse
      </figcaption>
    </figure>
  );
}
