"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import styles from "./cadre.module.css";
import Bandeau from "@/components/Bandeau";

/**
 * Le côté « La fiche » du comparateur : l'image de présentation seule, sans
 * texte dessus (demande de Sarah, 24/09), et le bouton play en transparence
 * (repris de WFG 1) :
 * le videopitch prend alors la place de l'image.
 */
export default function CoteFiche({
  image,
  bandeau,
  videopitch,
  onVideo,
  lienRetour,
}: {
  image: string | null;
  bandeau?: string | null;
  videopitch?: ReactNode;
  /** Prévient quand on lance la vidéo (le cadre affiche alors le
      bouton de langue). */
  onVideo?: () => void;
  /** Pour l'auteur et l'admin : la page de saisie d'où l'on vient. Un clic
      sur l'image y ramène — on sort du « zoom » (01/10). */
  lienRetour?: string | null;
}) {
  const router = useRouter();
  const [video, setVideo] = useState(false);

  if (video && videopitch) {
    return <div className={styles.coteVideo}>{videopitch}</div>;
  }

  return (
    <div
      className={lienRetour ? `${styles.coteFiche} ${styles.coteFicheRetour}` : styles.coteFiche}
      {...(lienRetour
        ? {
            role: "link",
            tabIndex: 0,
            "aria-label": "Revenir à la saisie de la fiche",
            onClick: (e: React.MouseEvent) => {
              if (!(e.target as Element).closest("button")) router.push(lienRetour);
            },
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" && e.target === e.currentTarget) router.push(lienRetour);
            },
          }
        : {})}
    >
      <Bandeau valeur={bandeau ?? null} grand />
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
