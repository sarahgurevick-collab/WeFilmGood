import { COULEURS_SATISFACTION, positionSatisfaction } from "@/lib/satisfaction";
import styles from "./JaugeSatisfaction.module.css";

export const RAYON_JAUGE = 46;
export const TOUR_JAUGE = 2 * Math.PI * RAYON_JAUGE;

/**
 * La satisfaction d'un auteur, telle qu'on la lit : un cercle rempli d'un
 * quart par position, dans la couleur de la position, le chiffre au centre
 * (Sarah, 21/11/2026, d'après « Gauge » de designali-in sur 21st.dev).
 * Sans note : un tiret.
 */
export default function JaugeSatisfaction({
  position,
  taille = 32,
  sansChiffre = false,
}: {
  /** De 1 à 4. */
  position: number | null | undefined;
  taille?: number;
  /** Pour les très petites tailles, où le chiffre ne se lirait pas. */
  sansChiffre?: boolean;
}) {
  const n = positionSatisfaction(position);
  if (!n) return <>—</>;
  return (
    <svg
      className={styles.jauge}
      viewBox="0 0 120 120"
      width={taille}
      height={taille}
      role="img"
      aria-label={`${n} sur 4`}
    >
      <circle className={styles.piste} cx={60} cy={60} r={RAYON_JAUGE} />
      <circle
        className={styles.arc}
        cx={60}
        cy={60}
        r={RAYON_JAUGE}
        transform="rotate(-90 60 60)"
        stroke={COULEURS_SATISFACTION[n - 1]}
        strokeDasharray={`${(TOUR_JAUGE * n) / 4} ${TOUR_JAUGE}`}
      />
      {!sansChiffre && (
        <text className={styles.chiffre} x={60} y={60} textAnchor="middle" dominantBaseline="central">
          {n}
        </text>
      )}
    </svg>
  );
}
