"use client";

import { useState, type ReactNode } from "react";
import styles from "./cadre.module.css";

/**
 * Le côté « La fiche » du comparateur : l'image de présentation seule, sans
 * texte dessus (demande de Sarah, 24/09), et le bouton play en transparence
 * (repris de WFG 1) :
 * le videopitch prend alors la place de l'image.
 */
export default function CoteFiche({
  image,
  videopitch,
  onVideo,
}: {
  image: string | null;
  videopitch?: ReactNode;
  /** Prévient quand on lance la vidéo (le cadre affiche alors le
      bouton de langue). */
  onVideo?: () => void;
}) {
  const [video, setVideo] = useState(false);

  if (video && videopitch) {
    return <div className={styles.coteVideo}>{videopitch}</div>;
  }

  return (
    <div className={styles.coteFiche}>
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className={styles.coteFicheImage} draggable={false} />
      )}
      {/* Le bouton play en transparence au centre, comme sur WFG 1. */}
      {videopitch && (
        <button
          type="button"
          className={styles.play}
          onClick={() => {
            setVideo(true);
            onVideo?.();
          }}
          aria-label="Voir le videopitch"
        >
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="48" />
            <path d="M40 30 L72 50 L40 70 Z" />
          </svg>
        </button>
      )}
    </div>
  );
}
