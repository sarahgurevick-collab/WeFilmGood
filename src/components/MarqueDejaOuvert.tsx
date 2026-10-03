import styles from "@/app/pitchotheque/projets.module.css";

/** Le petit repère « déjà ouvert » (03/10), posé dans un coin de la vignette : un œil, sans texte. */
export default function MarqueDejaOuvert() {
  return (
    <span className={styles.dejaOuvert} aria-label="Déjà ouvert" role="img">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    </span>
  );
}
