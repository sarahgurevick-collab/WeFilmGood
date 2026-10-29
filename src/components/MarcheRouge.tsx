import styles from "./MarcheRouge.module.css";

/**
 * L'escalier rouge : la silhouette du logo pendant l'attente.
 *
 * Le disque n'est dessiné que par son trait (l'arc, interrompu là où le
 * logo a son encoche), et l'encoche en marches est remplie de six carrés
 * qui s'allument tour à tour (d'après l'animation de chargement de L'inis,
 * demandée par Sarah le 29/10 ; l'arc ajouté le même jour pour qu'on
 * reconnaisse le logo). Mêmes cotes que Logo.tsx : centre (608,5 ; 559,5),
 * rayon 531,5 ; les marches partent de l'angle de l'encoche (444 ; 358). Ordre d'allumage : marche du haut à droite, la diagonale,
 * puis le reste.
 */
/* Trois marches carrées, collées, qui partent de l'angle de l'encoche
   (444 ; 358) et restent entières à l'intérieur de l'arc : rien n'est
   découpé par le cercle (demande de Sarah, 29/10). */
const X = [444, 617, 790, 963];
const Y = [358, 531, 704, 877];
const ECART = 0;

/* [colonne, ligne, rang d'allumage] */
const CASES: [number, number, number][] = [
  [2, 0, 1],
  [1, 1, 2],
  [2, 1, 4],
  [0, 2, 3],
  [1, 2, 5],
  [2, 2, 6],
];

export default function MarcheRouge({ taille = 104, libelle = "Chargement" }: { taille?: number; libelle?: string }) {
  return (
    <span className={styles.marche} style={{ width: taille, height: taille }} role="status" aria-label={libelle}>
      <svg viewBox="40 -10 1140 1140" width={taille} height={taille} aria-hidden="true">
        {/* L'arc du disque, de l'angle haut-droit de l'encoche à son pied. */}
        <path
          className={styles.arc}
          d="M 1100.3 358 A 531.5 531.5 0 1 0 444 1064.9"
        />
        <g>
          {CASES.map(([c, l, n]) => (
            <rect
              key={n}
              className={styles.cube}
              style={{ animationDelay: `${(n - 1) * 0.16}s` }}
              x={X[c] + ECART}
              y={Y[l] + ECART}
              width={X[c + 1] - X[c] - 2 * ECART}
              height={Y[l + 1] - Y[l] - 2 * ECART}
            />
          ))}
        </g>
      </svg>
    </span>
  );
}
