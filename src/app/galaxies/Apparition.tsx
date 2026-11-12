"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./duo.module.css";

/**
 * Une carte des Galaxies qui monte et apparaît quand elle entre dans
 * l'écran (12/11/2026). Une fois apparue, elle le reste.
 */
export default function Apparition({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLLIElement>(null);
  const [vu, setVu] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          setVu(true);
          observateur.disconnect();
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    observateur.observe(el);
    return () => observateur.disconnect();
  }, []);

  return (
    <li ref={ref} className={`${styles.item} ${vu ? styles.vu : ""}`}>
      {children}
    </li>
  );
}
