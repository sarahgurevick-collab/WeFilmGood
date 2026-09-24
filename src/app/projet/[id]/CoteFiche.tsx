"use client";

import { useState, type ReactNode } from "react";
import styles from "./cadre.module.css";

/**
 * Le côté « La fiche » du comparateur : l'image de présentation, la
 * tagline par-dessus, et le videopitch qui prend la place de l'image quand
 * on le lance.
 */
export default function CoteFiche({
  image,
  tagline,
  videopitch,
}: {
  image: string | null;
  tagline: string | null;
  videopitch?: ReactNode;
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
      <div className={styles.coteFicheTexte}>
        {tagline && <p className={styles.coteFicheTagline}>{tagline}</p>}
        {videopitch && (
          <button type="button" className={styles.coteFicheVideo} onClick={() => setVideo(true)}>
            <span aria-hidden="true">▶</span> Videopitch
          </button>
        )}
      </div>
    </div>
  );
}
