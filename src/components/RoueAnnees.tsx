"use client";

import { useEffect, useRef } from "react";
import styles from "./RoueAnnees.module.css";

/**
 * La roue des années (15/10/2026, Sarah, d'après l'« Option Wheel » de
 * 21st.dev) : les années courbées en roue, celle du centre en rouge, les
 * autres de plus en plus petites et pâles. On tourne à la molette, en
 * tirant à la souris ou au doigt, aux flèches du clavier, ou d'un clic sur
 * une année. Le choix remonte au parent, qui affiche ce qui correspond.
 */
const PAS_PX = 44;
const VISIBLES = 4; // de chaque côté

export default function RoueAnnees({
  annees,
  valeur,
  onChange,
}: {
  annees: number[];
  valeur: number;
  onChange: (annee: number) => void;
}) {
  const index = Math.max(0, annees.indexOf(valeur));
  const zone = useRef<HTMLDivElement | null>(null);
  const glisse = useRef(false);
  const cumul = useRef(0);
  const dernierY = useRef(0);
  const derniereMolette = useRef(0);

  const aller = (i: number) => {
    const j = Math.max(0, Math.min(annees.length - 1, i));
    if (j !== index) onChange(annees[j]);
  };

  // La molette : un cran par coup, pas plus vite qu'un par 120 ms.
  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    const molette = (e: WheelEvent) => {
      e.preventDefault();
      const t = Date.now();
      if (t - derniereMolette.current < 120) return;
      derniereMolette.current = t;
      aller(index + (e.deltaY > 0 ? 1 : -1));
    };
    el.addEventListener("wheel", molette, { passive: false });
    return () => el.removeEventListener("wheel", molette);
  });

  // Tirer : chaque PAS_PX pixels parcourus = un cran.
  useEffect(() => {
    const mouvement = (y: number) => {
      if (!glisse.current) return;
      cumul.current += y - dernierY.current;
      dernierY.current = y;
      while (cumul.current <= -PAS_PX) {
        cumul.current += PAS_PX;
        aller(index + 1);
      }
      while (cumul.current >= PAS_PX) {
        cumul.current -= PAS_PX;
        aller(index - 1);
      }
    };
    const souris = (e: MouseEvent) => mouvement(e.clientY);
    const doigt = (e: TouchEvent) => {
      if (!glisse.current) return;
      e.preventDefault();
      mouvement(e.touches[0].clientY);
    };
    const fin = () => {
      glisse.current = false;
    };
    document.addEventListener("mousemove", souris);
    document.addEventListener("mouseup", fin);
    document.addEventListener("touchmove", doigt, { passive: false });
    document.addEventListener("touchend", fin);
    return () => {
      document.removeEventListener("mousemove", souris);
      document.removeEventListener("mouseup", fin);
      document.removeEventListener("touchmove", doigt);
      document.removeEventListener("touchend", fin);
    };
  });

  const debut = (y: number) => {
    glisse.current = true;
    cumul.current = 0;
    dernierY.current = y;
  };

  return (
    <div
      ref={zone}
      className={styles.roue}
      role="listbox"
      aria-label="Choisir une année"
      aria-activedescendant={`annee-${valeur}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          aller(index + 1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          aller(index - 1);
        }
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        debut(e.clientY);
      }}
      onTouchStart={(e) => debut(e.touches[0].clientY)}
    >
      {annees.map((a, i) => {
        const d = i - index;
        if (Math.abs(d) > VISIBLES) return null;
        const ecart = Math.abs(d);
        const echelle = 1 - ecart * 0.13;
        const opacite = 1 - ecart * 0.2;
        return (
          <button
            key={a}
            id={`annee-${a}`}
            type="button"
            role="option"
            aria-selected={d === 0}
            className={d === 0 ? styles.active : styles.annee}
            style={{
              transform: `translate(-50%, -50%) translateY(${d * PAS_PX}px) translateX(${ecart * ecart * 3}px) scale(${echelle})`,
              opacity: opacite,
              filter: ecart > 1 ? `blur(${(ecart - 1) * 0.6}px)` : undefined,
            }}
            onClick={() => aller(i)}
            tabIndex={-1}
          >
            {a}
          </button>
        );
      })}
    </div>
  );
}
