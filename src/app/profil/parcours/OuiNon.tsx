"use client";

import { useState, type ReactNode } from "react";
import formStyles from "@/components/form.module.css";
import styles from "@/app/projet/deposer.module.css";

/**
 * Une question oui/non avec l'interrupteur gris/rouge déjà utilisé pour
 * les prix d'un projet, posé à côté de la question. Sur « oui », ce qu'il
 * y a à remplir s'ouvre. La réponse part toujours avec le formulaire
 * (`nom` = « oui » ou « non ») : ne pas toucher l'interrupteur, c'est non.
 */
export default function OuiNon({
  question,
  nom,
  initial,
  children,
}: {
  question: string;
  nom: string;
  initial: boolean;
  children: ReactNode;
}) {
  const [oui, setOui] = useState(initial);
  return (
    <div className={formStyles.field}>
      <label className={styles.question}>
        <span>{question}</span>
        <span className={styles.interrupteur}>
          <input type="checkbox" checked={oui} onChange={(e) => setOui(e.target.checked)} />
          <span className={styles.rond} aria-hidden="true" />
        </span>
      </label>
      <input type="hidden" name={nom} value={oui ? "oui" : "non"} />
      {oui && children}
    </div>
  );
}
