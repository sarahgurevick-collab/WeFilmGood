import type { CSSProperties } from "react";
import styles from "./PitchWall.module.css";

export type Pitch = {
  id: string;
  vimeo_id: string | null;
  title: string | null;
};

/**
 * Mise en place du collage : une entrée par emplacement à l'écran.
 * x,y   = position dans le tas, au repos (% de l'écran)
 * sx,sy = position une fois dispersée, au survol
 * r,r2  = inclinaison au repos / une fois dispersée
 * w     = largeur en vmin
 */
const LAYOUT = [
  { x: 44.5, y: 43, sx: 23, sy: 24, w: 24, r: -27, r2: -33 },
  { x: 55.5, y: 37, sx: 59, sy: 6, w: 19, r: 14, r2: 8 },
  { x: 39, y: 54, sx: 17, sy: 44, w: 27, r: 33, r2: 27 },
  { x: 61, y: 50, sx: 80, sy: 45, w: 22, r: -8, r2: -2 },
  { x: 50, y: 59, sx: 52, sy: 82, w: 30, r: 21, r2: 28 },
  { x: 64.5, y: 39, sx: 74, sy: 14, w: 18, r: -35, r2: -29 },
  { x: 34, y: 39, sx: 14, sy: 12, w: 25, r: 6, r2: 12 },
  { x: 53.5, y: 64.5, sx: 60, sy: 76, w: 21, r: 28, r2: 22 },
  { x: 41, y: 32, sx: 31, sy: 7, w: 28, r: -19, r2: -25 },
  { x: 68, y: 55.5, sx: 94, sy: 62, w: 23, r: 11, r2: 5 },
  { x: 28, y: 48, sx: 6, sy: 33, w: 20, r: -31, r2: -24 },
  { x: 59, y: 28, sx: 46, sy: 17, w: 26, r: 17, r2: 23 },
  { x: 48, y: 50, sx: 32, sy: 28, w: 29, r: 3, r2: -4 },
  { x: 71.5, y: 44.5, sx: 68, sy: 33, w: 22, r: -24, r2: -18 },
  { x: 37, y: 63, sx: 21, sy: 68, w: 19, r: 36, r2: 30 },
  { x: 62.5, y: 70, sx: 77, sy: 66, w: 27, r: -13, r2: -7 },
  { x: 25, y: 57, sx: 8, sy: 58, w: 24, r: 25, r2: 31 },
  { x: 52, y: 25, sx: 67, sy: 26, w: 21, r: -6, r2: 1 },
  { x: 75, y: 34, sx: 89, sy: 9, w: 25, r: 30, r2: 24 },
  { x: 43, y: 71.5, sx: 36, sy: 68, w: 18, r: -29, r2: -35 },
  { x: 32, y: 25, sx: 33, sy: 90, w: 28, r: 9, r2: 15 },
  { x: 66, y: 62.5, sx: 70, sy: 88, w: 23, r: 19, r2: 13 },
  { x: 21, y: 39, sx: 12, sy: 84, w: 26, r: -17, r2: -23 },
  { x: 79, y: 59, sx: 88, sy: 80, w: 20, r: 23, r2: 29 },
  { x: 46.5, y: 35.5, sx: 91, sy: 36, w: 22, r: -11, r2: -5 },
];

const PLACEHOLDERS = [
  styles.ph0,
  styles.ph1,
  styles.ph2,
  styles.ph3,
  styles.ph4,
  styles.ph5,
];

export default function PitchWall({ pitches }: { pitches: Pitch[] }) {
  return (
    <div className={styles.stage}>
      {LAYOUT.map((slot, i) => {
        const pitch = pitches[i];
        const style = {
          "--x": `${slot.x}%`,
          "--y": `${slot.y}%`,
          "--sx": `${slot.sx}%`,
          "--sy": `${slot.sy}%`,
          "--w": `${slot.w}vmin`,
          "--r": `${slot.r}deg`,
          "--r2": `${slot.r2}deg`,
          "--d": `${(i % 7) * 0.025}s`,
        } as CSSProperties;

        return (
          <div key={pitch?.id ?? `slot-${i}`} className={styles.tile} style={style}>
            {pitch?.vimeo_id ? (
              <iframe
                src={`https://player.vimeo.com/video/${pitch.vimeo_id}?background=1&autoplay=1&loop=1&muted=1`}
                allow="autoplay"
                title={pitch.title ?? ""}
              />
            ) : (
              <div className={`${styles.ph} ${PLACEHOLDERS[i % 6]}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
