import type { CSSProperties } from "react";
import styles from "./FeuArtifice.module.css";

const COULEURS = ["var(--rouge-wfg)", "#ffd166", "#ffffff", "#ff8a5c"];

/** Cinq gerbes décalées dans le temps et l'espace autour du point d'origine. */
const GERBES = [
  { x: 0, y: -10, delai: 0, rayon: 130 },
  { x: -110, y: -60, delai: 0.3, rayon: 100 },
  { x: 115, y: -50, delai: 0.55, rayon: 105 },
  { x: -60, y: 50, delai: 0.85, rayon: 85 },
  { x: 70, y: 55, delai: 1.1, rayon: 90 },
];

const ETINCELLES = 30;

/**
 * Éclats en CSS pur, joués une seule fois : chaque étincelle part du centre de
 * sa gerbe vers un point du cercle, puis retombe et s'éteint.
 */
export default function FeuArtifice() {
  return (
    <div className={styles.scene} aria-hidden="true">
      {GERBES.map((g, gi) =>
        Array.from({ length: ETINCELLES }, (_, i) => {
          const angle = (i / ETINCELLES) * Math.PI * 2;
          const rayon = g.rayon * (0.75 + ((i * 7) % 5) / 10);
          return (
            <i
              key={`${gi}-${i}`}
              className={styles.etincelle}
              style={
                {
                  "--x": `${g.x}px`,
                  "--y": `${g.y}px`,
                  "--dx": `${Math.cos(angle) * rayon}px`,
                  "--dy": `${Math.sin(angle) * rayon}px`,
                  "--couleur": COULEURS[(i + gi) % COULEURS.length],
                  "--delai": `${g.delai}s`,
                } as CSSProperties
              }
            />
          );
        }),
      )}
    </div>
  );
}
