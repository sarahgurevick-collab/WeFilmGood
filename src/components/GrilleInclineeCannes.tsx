"use client";

import {
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useTransform,
  cubicBezier,
} from "framer-motion";
import { useMemo, useRef } from "react";
import placeholders from "@/styles/placeholders.module.css";
import styles from "./GrilleInclineeCannes.module.css";

const PLACEHOLDERS = [
  placeholders.ph0,
  placeholders.ph1,
  placeholders.ph2,
  placeholders.ph3,
  placeholders.ph4,
  placeholders.ph5,
];

const easeIntoFocus = cubicBezier(0.22, 1, 0.36, 1);
const easeOutOfFocus = cubicBezier(0, 0, 0.58, 1);
const focusEase: [typeof easeIntoFocus, typeof easeOutOfFocus] = [
  easeIntoFocus,
  easeOutOfFocus,
];

type Cote = "G" | "D";

function Case({
  src,
  cote,
  index,
}: {
  src: string | null;
  cote: Cote;
  index: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: p } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const reduit = useReducedMotion();
  const signe = cote === "G" ? -1 : 1;

  const flou = useTransform(p, [0, 0.5, 1], [8, 0, 8], { ease: focusEase });
  const luminosite = useTransform(p, [0, 0.5, 1], [0, 1, 0], {
    ease: focusEase,
  });
  const contraste = useTransform(p, [0, 0.5, 1], [4, 1, 4], {
    ease: focusEase,
  });

  const ty = useTransform(p, [0, 0.5, 1], ["100%", "0%", "-100%"], {
    ease: focusEase,
  });
  const tz = useTransform(p, [0, 0.5, 1], [300, 0, 300], { ease: focusEase });
  const rx = useTransform(p, [0, 0.5, 1], [70, 0, -70], { ease: focusEase });
  const tx = useTransform(
    p,
    [0, 0.5, 1],
    [`${signe * 40}%`, "0%", `${signe * 40}%`],
    { ease: focusEase },
  );
  const rotation = useTransform(p, [0, 0.5, 1], [-signe * 5, 0, signe * 5], {
    ease: focusEase,
  });
  const inclinaison = useTransform(
    p,
    [0, 0.5, 1],
    [signe * 20, 0, -signe * 20],
    { ease: focusEase },
  );
  const echelleInterne = useTransform(p, [0, 0.5, 1], [1.8, 1, 1.8], {
    ease: focusEase,
  });

  const filtre = useMotionTemplate`blur(${flou}px) brightness(${luminosite}) contrast(${contraste})`;

  const fond = src
    ? { backgroundImage: `url("${src}")` }
    : undefined;
  const classeVignette = src
    ? styles.vignette
    : `${styles.vignette} ${PLACEHOLDERS[index % PLACEHOLDERS.length]}`;

  if (reduit) {
    return (
      <figure ref={ref} className={styles.case}>
        <div className={styles.cadre}>
          <div className={classeVignette} style={fond} />
        </div>
      </figure>
    );
  }

  return (
    <motion.figure
      ref={ref}
      className={styles.case}
      style={{ willChange: "transform" }}
    >
      <motion.div
        className={styles.cadre}
        style={{
          filter: filtre,
          x: tx,
          y: ty,
          z: tz,
          rotate: rotation,
          rotateX: rx,
          skewX: inclinaison,
        }}
      >
        <motion.div
          className={classeVignette}
          style={{
            ...fond,
            scaleY: echelleInterne,
            backfaceVisibility: "hidden",
          }}
        />
      </motion.div>
    </motion.figure>
  );
}

export type GrilleInclineeCannesProps = {
  /** URLs des vraies photos. Tant qu'une case n'a pas de photo, elle retombe sur un dégradé de la charte. */
  photos?: string[];
  /** Nombre de cases affichées. */
  count?: number;
};

export default function GrilleInclineeCannes({
  photos,
  count = 8,
}: GrilleInclineeCannesProps) {
  const cases = useMemo(
    () => Array.from({ length: count }, (_, i) => photos?.[i] ?? null),
    [photos, count],
  );

  return (
    <section className={styles.section} aria-hidden="true">
      <div className={styles.grille}>
        {cases.map((src, i) => (
          <Case key={i} src={src} cote={i % 2 === 0 ? "G" : "D"} index={i} />
        ))}
      </div>
    </section>
  );
}
