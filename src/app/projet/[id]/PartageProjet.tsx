"use client";

import { useState } from "react";
import formStyles from "@/components/form.module.css";
import styles from "./partage-controle.module.css";

/**
 * Le lien se copie d'un geste : un auteur qui démarche un producteur est
 * en train d'écrire un email, pas de naviguer dans ses réglages.
 */
export default function PartageProjet({ url }: { url: string }) {
  const [copie, setCopie] = useState(false);

  return (
    <div className={styles.bloc}>
      <input className={styles.champ} value={url} readOnly onFocus={(e) => e.target.select()} />
      <button
        type="button"
        className={formStyles.submit}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopie(true);
            setTimeout(() => setCopie(false), 2500);
          } catch {
            // Presse-papiers refusé par le navigateur : le champ reste
            // sélectionnable à la main.
          }
        }}
      >
        {copie ? "Lien copié" : "Copier le lien"}
      </button>
    </div>
  );
}
