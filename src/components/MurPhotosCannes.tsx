"use client";

import { useEffect, useRef } from "react";
import placeholders from "@/styles/placeholders.module.css";
import styles from "./MurPhotosCannes.module.css";

const PLACEHOLDERS = [
  placeholders.ph0,
  placeholders.ph1,
  placeholders.ph2,
  placeholders.ph3,
  placeholders.ph4,
  placeholders.ph5,
];

/** Gabarits des cases, dans l'ordre : casse la grille régulière pour un
 * rendu "collage" plutôt qu'une mosaïque uniforme. */
const GABARITS = [
  styles.grande,
  styles.normale,
  styles.haute,
  styles.normale,
  styles.large,
  styles.normale,
  styles.normale,
  styles.haute,
  styles.large,
  styles.normale,
];

export type MurPhotosCannesProps = {
  /** URLs des vraies photos, dans l'ordre des cases. Tant qu'une case n'a
   * pas de photo, elle retombe sur un dégradé de la charte. */
  photos?: string[];
};

export default function MurPhotosCannes({ photos }: MurPhotosCannesProps) {
  const racine = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const tuiles = racine.current?.querySelectorAll(`.${styles.tuile}`);
    if (!tuiles) return;

    const reduit = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduit) {
      tuiles.forEach((tuile) => tuile.classList.add(styles.visible));
      return;
    }

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (entree.isIntersecting) {
            entree.target.classList.add(styles.visible);
            observateur.unobserve(entree.target);
          }
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" },
    );

    tuiles.forEach((tuile) => observateur.observe(tuile));
    return () => observateur.disconnect();
  }, []);

  return (
    <div ref={racine} className={styles.mur} aria-hidden="true">
      {GABARITS.map((gabarit, i) => (
        <div
          key={i}
          className={`${styles.tuile} ${gabarit}`}
          style={{ transitionDelay: `${(i % 4) * 0.06}s` }}
        >
          {photos?.[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photos[i]}
              alt=""
              loading="lazy"
              className={styles.image}
            />
          ) : (
            <div
              className={`${styles.image} ${PLACEHOLDERS[i % PLACEHOLDERS.length]}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
