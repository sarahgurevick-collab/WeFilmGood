"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ROUGE_WFG } from "@/lib/engagements";
import { ELEMENTS_MENU } from "./elements-menu";
import styles from "./BarreNav.module.css";

/**
 * Le « Menu » de la barre noire (24/11/2026, Sarah : « un menu comme sur
 * WFG 1 »). La même liste que celui de la bande blanche. CinéCrush y est
 * rangé plutôt qu'affiché en onglet : le voir en haut tout le temps peut
 * lasser l'auteur dont le projet n'est pas assez abouti pour en bénéficier.
 * Rien n'y respire : le rappel du CinéCrush reste sur la carte des Galaxies.
 * Sur téléphone, la barre est en bas : la liste s'ouvre vers le haut.
 */
export default function MenuBarre() {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", dehors);
    window.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("mousedown", dehors);
      window.removeEventListener("keydown", touche);
    };
  }, [ouvert]);

  return (
    <div className={styles.menu} ref={ref}>
      <button type="button" className={`${styles.onglet} ${styles.menuBouton}`} aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        Menu
        <svg className={styles.menuChevron} data-ouvert={ouvert} viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {ouvert && (
        <ul className={styles.menuListe}>
          {ELEMENTS_MENU.map((el) => (
            <li key={el.href}>
              <Link href={el.href} onClick={() => setOuvert(false)}>
                {el.special ? (
                  <span className="notranslate" translate="no">
                    <span style={{ color: ROUGE_WFG }}>Ciné</span>
                    <span style={{ color: "var(--engagement, #da2c25)" }}>{el.label.replace(/^Ciné/, "")}</span>
                  </span>
                ) : (
                  el.label
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
