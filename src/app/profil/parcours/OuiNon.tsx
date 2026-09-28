"use client";

import { useState, type ReactNode } from "react";
import formStyles from "@/components/form.module.css";
import styles from "./OuiNon.module.css";

/**
 * Deux boutons Oui / Non. « Oui » (rouge) déplie ce qu'il y a à remplir ;
 * « Non » (gris) le replie. Tant qu'aucun n'est choisi, la question reste
 * sans réponse. La réponse part avec le formulaire dans `nom` (« oui » /
 * « non », rien si pas de réponse).
 */
export default function OuiNon({
  question,
  nom,
  initial,
  children,
}: {
  question: string;
  nom: string;
  initial: boolean | null;
  children: ReactNode;
}) {
  const [reponse, setReponse] = useState<boolean | null>(initial);
  return (
    <div className={formStyles.field}>
      <span>{question}</span>
      <div className={styles.boutons}>
        <button
          type="button"
          aria-pressed={reponse === true}
          className={`${styles.bouton} ${reponse === true ? styles.oui : ""}`}
          onClick={() => setReponse(true)}
        >
          Oui
        </button>
        <button
          type="button"
          aria-pressed={reponse === false}
          className={`${styles.bouton} ${reponse === false ? styles.non : ""}`}
          onClick={() => setReponse(false)}
        >
          Non
        </button>
      </div>
      {reponse !== null && <input type="hidden" name={nom} value={reponse ? "oui" : "non"} />}
      {reponse === true && children}
    </div>
  );
}
