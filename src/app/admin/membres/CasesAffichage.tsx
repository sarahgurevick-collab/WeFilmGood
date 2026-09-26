"use client";

import styles from "./page.module.css";

/**
 * Les cases du bouton « Affichage » : cocher une case ajoute aussitôt sa
 * colonne (le formulaire est renvoyé), sans passer par « Filtrer ».
 */
export default function CasesAffichage({
  cases,
  cochees,
}: {
  cases: [string, string][];
  cochees: string[];
}) {
  return (
    <details className={styles.affichage}>
      <summary>Affichage</summary>
      <div className={styles.cases}>
        {cases.map(([cle, l]) => (
          <label key={cle}>
            <input
              type="checkbox"
              name="aff"
              value={cle}
              defaultChecked={cochees.includes(cle)}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
            />
            {l}
          </label>
        ))}
      </div>
    </details>
  );
}
