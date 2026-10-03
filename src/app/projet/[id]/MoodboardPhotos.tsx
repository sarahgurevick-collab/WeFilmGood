"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./moodboard.module.css";

/**
 * Le moodboard (03/10) : toutes les photos en petit, visibles d'un coup
 * dans leur cadre. Un clic ouvre la photo en grand, avec le compteur
 * « 3 / 10 », les flèches (ou les touches ← →, ou un glissement du doigt)
 * pour passer à la suivante, et la croix × pour refermer.
 */
export default function MoodboardPhotos({
  photos,
  remplir = false,
}: {
  photos: string[];
  /** Dans le cadre de droite (grand écran) : les photos se répartissent pour remplir toute la hauteur. */
  remplir?: boolean;
}) {
  const [ouverte, setOuverte] = useState<number | null>(null);
  // La vignette cliquée, pour lui rendre le focus à la fermeture.
  const retour = useRef<HTMLElement | null>(null);
  const departToucher = useRef<number | null>(null);
  const total = photos.length;
  const estOuverte = ouverte !== null;
  // Remplir le cadre : autant de colonnes que le nombre de photos le demande,
  // et les rangées se partagent la hauteur (9 photos : 3 × 3 ; 10 : 4 × 3).
  const colonnes = total <= 2 ? 1 : total <= 4 ? 2 : total <= 9 ? 3 : 4;
  const rangees = Math.ceil(total / colonnes);

  const aller = useCallback(
    (delta: number) => setOuverte((i) => (i === null ? i : (i + delta + total) % total)),
    [total],
  );
  const fermer = useCallback(() => {
    setOuverte(null);
    retour.current?.focus();
  }, []);

  useEffect(() => {
    if (!estOuverte) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
      else if (e.key === "ArrowLeft") aller(-1);
      else if (e.key === "ArrowRight") aller(1);
    };
    window.addEventListener("keydown", touche);
    // La page ne défile plus derrière la photo.
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", touche);
      document.body.style.overflow = avant;
    };
  }, [estOuverte, aller, fermer]);

  return (
    <>
      <ul
        className={`${styles.mosaique} ${remplir ? styles.remplit : ""}`}
        style={
          remplir
            ? { gridTemplateColumns: `repeat(${colonnes}, 1fr)`, gridTemplateRows: `repeat(${rangees}, minmax(0, 1fr))` }
            : undefined
        }
      >
        {photos.map((src, i) => (
          <li key={src}>
            <button
              type="button"
              className={styles.vignette}
              aria-label={`Photo ${i + 1} sur ${total}`}
              onClick={(e) => {
                retour.current = e.currentTarget;
                setOuverte(i);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" draggable={false} />
            </button>
          </li>
        ))}
      </ul>

      {ouverte !== null &&
        createPortal(
          <div
            className={styles.fond}
            role="dialog"
            aria-modal="true"
            aria-label="Moodboard"
            onClick={(e) => {
              if (e.target === e.currentTarget) fermer();
            }}
            onTouchStart={(e) => {
              departToucher.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              const depart = departToucher.current;
              departToucher.current = null;
              if (depart === null) return;
              const decalage = e.changedTouches[0].clientX - depart;
              if (Math.abs(decalage) > 50) aller(decalage < 0 ? 1 : -1);
            }}
          >
            <button type="button" className={styles.fermer} onClick={fermer} aria-label="Fermer" autoFocus>
              ×
            </button>
            {total > 1 && (
              <button type="button" className={`${styles.fleche} ${styles.precedente}`} onClick={() => aller(-1)} aria-label="Photo précédente">
                ‹
              </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.grande} src={photos[ouverte]} alt="" draggable={false} />
            {total > 1 && (
              <button type="button" className={`${styles.fleche} ${styles.suivante}`} onClick={() => aller(1)} aria-label="Photo suivante">
                ›
              </button>
            )}
            <p className={styles.compteur} aria-live="polite">
              {ouverte + 1} / {total}
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
