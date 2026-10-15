"use client";

import { useState } from "react";
import RoueTitres from "@/components/RoueTitres";
import styles from "./notre-histoire.module.css";

export type PhotoHistoire = { id: string; image: string; titre: string; sous?: string };

/**
 * Les photos de « Notre histoire » (15/10/2026, Sarah : « exactement le
 * même que les Masterclass ») : la photo à gauche, et à droite la roue
 * des titres — le festival et l'année — qui choisit la photo.
 */
export default function VisionneusePhotos({ photos }: { photos: PhotoHistoire[] }) {
  const [id, setId] = useState(photos[0]?.id ?? "");
  const actuelle = photos.find((p) => p.id === id) ?? photos[0];
  if (!actuelle) return null;
  return (
    <div className={styles.visionneuse}>
      <div className={styles.ecranPhoto}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img key={actuelle.id} src={actuelle.image} alt={[actuelle.titre, actuelle.sous].filter(Boolean).join(", ")} />
      </div>
      <RoueTitres
        titres={photos.map((p) => ({ id: p.id, label: p.titre, sous: p.sous }))}
        valeur={id}
        onChange={setId}
        etiquette="Choisir une photo"
      />
    </div>
  );
}
