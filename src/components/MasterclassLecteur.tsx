"use client";

import { useState } from "react";
import formStyles from "./form.module.css";
import styles from "./MasterclassLecteur.module.css";

export type Masterclass = { titre: string; vimeoId: string };

export default function MasterclassLecteur({
  masterclasses,
}: {
  masterclasses: Masterclass[];
}) {
  const [index, setIndex] = useState(0);
  const actuelle = masterclasses[index];

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

      <label className={formStyles.field}>
        <span>Choisir une masterclass</span>
        <select
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
        >
          {masterclasses.map((m, i) => (
            <option key={m.vimeoId} value={i}>
              {m.titre}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
