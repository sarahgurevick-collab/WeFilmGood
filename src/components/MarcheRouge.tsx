import styles from "./MarcheRouge.module.css";

/**
 * L'escalier rouge : six carrés qui dessinent l'encoche en marches du logo
 * et s'allument tour à tour (d'après l'animation de chargement de L'inis,
 * demandée par Sarah le 29/10). Grille de 3 × 3 : marche du haut à droite,
 * puis la diagonale, puis le reste, comme chez eux.
 */
const CASES: (number | null)[] = [null, null, 1, null, 2, 4, 3, 5, 6];

export default function MarcheRouge({ taille = 72 }: { taille?: number }) {
  return (
    <div className={styles.marche} style={{ width: taille, height: taille }} role="status" aria-label="Chargement">
      {CASES.map((n, i) => (
        <span key={i} className={n ? styles.cube : undefined} style={n ? { animationDelay: `${(n - 1) * 0.1}s` } : undefined} />
      ))}
    </div>
  );
}
