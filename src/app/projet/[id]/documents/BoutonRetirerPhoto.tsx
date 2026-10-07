"use client";

import { useTransition } from "react";
import styles from "../../blocs.module.css";
import { retirerImage } from "./actions";

/**
 * La croix × d'une photo du Moodboard (07/10, Sarah : la même croix que sur
 * le portrait d'un personnage). Elle envoie sa propre demande, sans passer
 * par le gros formulaire de la page (qui embarque aussi les fichiers choisis).
 */
export default function BoutonRetirerPhoto({ projectId, fileId }: { projectId: string; fileId: string }) {
  const [enCours, demarrer] = useTransition();
  return (
    <button
      type="button"
      className={styles.retirerCroix}
      aria-label="Retirer cette photo"
      disabled={enCours}
      onClick={() => {
        const donnees = new FormData();
        donnees.set("project_id", projectId);
        donnees.set("file_id", fileId);
        demarrer(async () => {
          await retirerImage(donnees);
        });
      }}
    >
      ×
    </button>
  );
}
