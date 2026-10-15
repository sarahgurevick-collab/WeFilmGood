"use client";

import { useState } from "react";
import RoueTitres from "./RoueTitres";
import styles from "./MasterclassLecteur.module.css";

export type Masterclass = { titre: string; vimeoId: string };

/** « Jacques FIESCHI - Cannes 2012 » → le nom, puis le festival et l'année. */
function decouper(titre: string): { nom: string; sous: string } {
  const m = titre.match(/^(.*?)\s*-?\s*((?:Cannes|Clermont-Ferrand)\s+\d{4})\s*$/);
  if (!m) return { nom: titre, sous: "" };
  return { nom: m[1].replace(/\s*-\s*$/, "").trim(), sous: m[2] };
}

/**
 * Les masterclass (15/10/2026, Sarah) : l'écran vidéo à gauche, et à
 * droite la roue des titres — les noms et les années — comme le « Wheel
 * Carousel » de 21st.dev. Le titre du centre est celui qui joue.
 */
export default function MasterclassLecteur({
  masterclasses,
  parDefaut,
}: {
  masterclasses: Masterclass[];
  /** La masterclass montrée à l'arrivée (identifiant Vimeo) ; sinon la première. */
  parDefaut?: string;
}) {
  const [id, setId] = useState(
    masterclasses.some((m) => m.vimeoId === parDefaut) ? (parDefaut as string) : (masterclasses[0]?.vimeoId ?? ""),
  );
  const actuelle = masterclasses.find((m) => m.vimeoId === id) ?? masterclasses[0];
  const titres = masterclasses.map((m) => {
    const { nom, sous } = decouper(m.titre);
    return { id: m.vimeoId, label: nom, sous };
  });

  return (
    <div className={styles.lecteur}>
      <div className={styles.ecran}>
        <iframe
          key={actuelle.vimeoId}
          src={`https://player.vimeo.com/video/${actuelle.vimeoId}`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={actuelle.titre}
        />
      </div>
      <RoueTitres titres={titres} valeur={id} onChange={setId} etiquette="Choisir une masterclass" />
    </div>
  );
}
