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

// Trois ou quatre étoiles qui brillent vraiment (14/10, Sarah) : plus
// grosses, un halo, et quatre rayons qui respirent lentement.
const BRILLANTES = [
  { x: 180, y: 160, taille: 9, delai: 0 },
  { x: 760, y: 120, taille: 7, delai: 1.3 },
  { x: 880, y: 640, taille: 8, delai: 2.1 },
  { x: 120, y: 760, taille: 6, delai: 3.4 },
];

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
      {BRILLANTES.map((b, i) => (
        <g
          key={`b${i}`}
          className={styles.brillante}
          style={{ animationDelay: `${b.delai}s` }}
          transform={`translate(${b.x} ${b.y})`}
        >
          <circle r={b.taille * 2.2} fill="url(#halo)" />
          <line x1={-b.taille * 2.6} y1="0" x2={b.taille * 2.6} y2="0" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />
          <line x1="0" y1={-b.taille * 2.6} x2="0" y2={b.taille * 2.6} stroke="#fff" strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />
          <circle r={b.taille * 0.32} fill="#fff" />
        </g>
      ))}
      {/* La comète descend doucement de gauche à droite ; la traînée part
          derrière elle, dans l'axe exact de sa course. */}
      <g className={styles.comete}>
        <line x1="0" y1="0" x2="-180" y2="-54" stroke="url(#trainee)" strokeWidth="2.2" strokeLinecap="round" />
        <circle r="5" fill="url(#halo)" />
        <circle r="1.8" fill="#fff" />
      </g>
      <defs>
        <linearGradient id="trainee" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="-180" y2="-54">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="halo">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
