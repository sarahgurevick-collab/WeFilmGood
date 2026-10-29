import styles from "./MarcheRouge.module.css";

/**
 * L'escalier rouge : la silhouette du logo pendant l'attente.
 *
 * Le disque n'est dessiné que par son trait (l'arc, interrompu là où le
 * logo a son encoche). Dans l'encoche, trois barres de carrés prennent la
 * place du texte « WE FILM GOOD » du logo complet : calées à gauche sur
 * les marches, elles sortent du cercle vers la droite comme lui (Sarah,
 * 29/10). Les carrés s'allument en vague, de gauche à droite et de haut
 * en bas (d'après l'animation de chargement de L'inis).
 *
 * Mêmes cotes que Logo.tsx : centre (608,5 ; 559,5), rayon 531,5, marches
 * aux abscisses 444, 643, 830 et aux ordonnées 358, 590, 823 ; le texte du
 * logo complet s'arrête vers 1 370.
 */
const X = [444, 643, 830, 1017, 1204, 1391];
/* Comme le texte du logo, chaque barre est posée un peu sous sa marche :
   la pointe de l'arc reste dégagée. */
const Y = [400, 620, 840, 1060];
const ECART = 10;
const LARGEUR = 1420; // de 40 à 1460
const HAUTEUR = 1140; // de -10 à 1130
const RATIO = LARGEUR / HAUTEUR;

/* [colonne, ligne] des carrés : une marche de plus par ligne. */
const CASES: [number, number][] = [];
for (let l = 0; l < 3; l++) for (let c = 2 - l; c < X.length - 1; c++) CASES.push([c, l]);

export default function MarcheRouge({ taille = 104, libelle = "Chargement" }: { taille?: number; libelle?: string }) {
  const largeur = Math.round(taille * RATIO);
  return (
    <span className={styles.marche} style={{ width: largeur, height: taille }} role="status" aria-label={libelle}>
      <svg viewBox={`40 -10 ${LARGEUR} ${HAUTEUR}`} width={largeur} height={taille} aria-hidden="true">
        {/* L'arc du disque, de l'angle haut-droit de l'encoche à son pied. */}
        <path className={styles.arc} d="M 1100.3 358 A 531.5 531.5 0 1 0 444 1064.9" />
        {CASES.map(([c, l]) => (
          <rect
            key={`${c}-${l}`}
            className={styles.cube}
            style={{ animationDelay: `${(c * 0.14 + l * 0.1).toFixed(2)}s` }}
            x={X[c] + ECART}
            y={Y[l] + ECART}
            width={X[c + 1] - X[c] - 2 * ECART}
            height={Y[l + 1] - Y[l] - 2 * ECART}
          />
        ))}
      </svg>
    </span>
  );
}
