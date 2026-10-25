"use client";

import { useEffect, useRef } from "react";
import styles from "./page.module.css";

/**
 * Les cases du bouton « Affichage » : cocher une case ajoute aussitôt sa
 * colonne (le formulaire des filtres se renvoie tout seul, FiltresAuto).
 * Un clic ailleurs sur la page ou la touche Échap le referme (25/10, Sarah :
 * « j'ai du mal à faire partir cet encart »).
 */
export default function CasesAffichage({
  cases,
  cochees,
}: {
  cases: [string, string][];
  cochees: string[];
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const fermer = (e: Event) => {
      const d = menu.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener("pointerdown", fermer);
    document.addEventListener("keydown", fermer);
    return () => {
      document.removeEventListener("pointerdown", fermer);
      document.removeEventListener("keydown", fermer);
    };
  }, []);

  return (
    <details ref={menu} className={styles.affichage}>
      <summary>Affichage</summary>
      <div className={styles.cases}>
        {cases.map(([cle, l]) => (
          <label key={cle}>
            <input
              type="checkbox"
              name="aff"
              value={cle}
              defaultChecked={cochees.includes(cle)}
            />
            {l}
          </label>
        ))}
      </div>
    </details>
  );
}
