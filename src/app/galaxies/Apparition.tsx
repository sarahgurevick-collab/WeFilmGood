"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./duo.module.css";

/**
 * Une carte des Galaxies qui sort du Finder (12/11/2026, idée de Sarah,
 * d'après « Perspective Tunnel Hero » de 21st.dev) : elle part de la barre
 * de recherche, minuscule et lointaine, grossit en venant vers nous et va
 * se poser à sa place, deux par deux. Les cartes partent l'une après
 * l'autre, dans l'ordre de la page.
 */
export default function Apparition({ children, rang }: { children: ReactNode; rang: number }) {
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add(styles.vu);
    const barre = document.querySelector("[data-finder-barre]");
    if (!barre || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const depart = barre.getBoundingClientRect();
    const arrivee = el.getBoundingClientRect();
    const dx = depart.left + depart.width / 2 - (arrivee.left + arrivee.width / 2);
    const dy = depart.top + depart.height / 2 - (arrivee.top + arrivee.height / 2);
    // Une légère vrille, d'un côté puis de l'autre, comme dans un tunnel.
    const vrille = rang % 2 === 0 ? -14 : 14;

    const vol = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(0.04) rotate(${vrille}deg)`, opacity: 0, filter: "blur(6px)" },
        { opacity: 1, filter: "blur(2px)", offset: 0.35 },
        { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1, filter: "blur(0px)" },
      ],
      { duration: 1300, delay: 150 + rang * 170, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "backwards" },
    );
    return () => vol.cancel();
  }, [rang]);

  return (
    <li ref={ref} className={styles.item}>
      {children}
    </li>
  );
}
