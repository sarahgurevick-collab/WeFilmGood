"use client";

import { useEffect, useRef } from "react";
import styles from "./fiches.module.css";

export type OptionCase = { valeur: string; libelle: string };

/**
 * Un sélecteur à cases à cocher (15/11) : un bouton qui rappelle ce qui est
 * choisi, et la liste qui s'ouvre dessous. Sert aux formats et aux années.
 */
export default function MenuCases({
  libelle,
  options,
  choisies,
  resume,
  onChange,
}: {
  libelle: string;
  options: OptionCase[];
  choisies: string[];
  resume: string;
  onChange: (suivantes: string[]) => void;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  // Un clic ailleurs referme la liste.
  useEffect(() => {
    const dehors = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener("mousedown", dehors);
    return () => document.removeEventListener("mousedown", dehors);
  }, []);

  return (
    <div className={styles.colonneEnPlus}>
      <span>{libelle}</span>
      <details ref={ref} className={styles.menuCases}>
        <summary>{resume}</summary>
        <div className={styles.menuListe}>
          {options.map((o) => {
            const coche = choisies.includes(o.valeur);
            return (
              <label key={o.valeur}>
                <input
                  type="checkbox"
                  checked={coche}
                  onChange={() =>
                    onChange(coche ? choisies.filter((c) => c !== o.valeur) : [...choisies, o.valeur])
                  }
                />
                {o.libelle}
              </label>
            );
          })}
        </div>
      </details>
    </div>
  );
}
