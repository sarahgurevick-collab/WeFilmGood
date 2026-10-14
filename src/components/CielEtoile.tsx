import styles from "./CielEtoile.module.css";

/**
 * Un ciel discret derrière la sphère des témoignages (14/10/2026, Sarah :
 * « quelques étoiles et une comète, léger, pas trop chargé »). Tout est
 * dessiné une fois en SVG ; seules quelques étoiles clignotent et une
 * comète passe de temps en temps, par animation CSS : rien ne tourne en
 * permanence dans le navigateur.
 *
 * Les positions sont tirées d'une suite fixe, pas de Math.random : le
 * serveur et le navigateur dessinent exactement le même ciel.
 */
const NB_ETOILES = 70;

function suite(graine: number) {
  let x = graine;
  return () => {
    x = (x * 1103515245 + 12345) % 2147483648;
    return x / 2147483648;
  };
}

const tirer = suite(20261014);
const ETOILES = Array.from({ length: NB_ETOILES }, (_, i) => ({
  x: Math.round(tirer() * 1000) / 10,
  y: Math.round(tirer() * 1000) / 10,
  r: 0.6 + tirer() * 1.1,
  o: 0.35 + tirer() * 0.55,
  // Une étoile sur quatre scintille, chacune à son rythme.
  clignote: i % 4 === 0,
  delai: tirer() * 6,
}));

export default function CielEtoile() {
  return (
    <svg className={styles.ciel} viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
      {ETOILES.map((e, i) => (
        <circle
          key={i}
          cx={e.x * 10}
          cy={e.y * 10}
          r={e.r}
          fill="#fff"
          opacity={e.o}
          className={e.clignote ? styles.scintille : undefined}
          style={e.clignote ? { animationDelay: `${e.delai}s` } : undefined}
        />
      ))}
      <g className={styles.comete}>
        <line x1="0" y1="0" x2="-140" y2="46" stroke="url(#trainee)" strokeWidth="2" strokeLinecap="round" />
        <circle cx="0" cy="0" r="2.4" fill="#fff" />
      </g>
      <defs>
        <linearGradient id="trainee" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
