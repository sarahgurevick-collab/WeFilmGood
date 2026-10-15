"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./RoueTitres.module.css";

export type TitreRoue = { id: string; label: string; sous?: string };

/**
 * La roue des titres (15/10/2026, Sarah, d'après le « Wheel Carousel » de
 * 21st.dev) : les titres posés sur un arc de cercle, celui du centre droit
 * et en clair avec un point rouge, les autres qui s'inclinent et pâlissent
 * en s'éloignant. On tourne à la molette, en tirant à la souris ou au
 * doigt, avec les flèches, ou d'un clic sur un titre. L'élan continue un
 * peu après qu'on a lâché.
 */
const PAS_DEG = 11; // l'angle entre deux titres
const RAYON = 520; // le rayon de l'arc, en pixels
const VISIBLES = 6; // de chaque côté

export default function RoueTitres({
  titres,
  valeur,
  onChange,
}: {
  titres: TitreRoue[];
  valeur: string;
  onChange: (id: string) => void;
}) {
  const index = Math.max(0, titres.findIndex((t) => t.id === valeur));
  // La position continue (en « crans ») : elle glisse vers l'index choisi,
  // et c'est elle qui place les titres, pour un mouvement fluide.
  const [position, setPosition] = useState(index);
  const cible = useRef(index);
  const vitesse = useRef(0);
  const glisse = useRef(false);
  const dernierY = useRef(0);
  const aBouge = useRef(false);
  const zone = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    cible.current = index;
  }, [index]);

  // Image par image : la position rejoint la cible, avec l'élan du geste.
  useEffect(() => {
    let id = 0;
    const pas = () => {
      setPosition((p) => {
        if (glisse.current) return p;
        if (Math.abs(vitesse.current) > 0.002) {
          const suivant = p + vitesse.current;
          vitesse.current *= 0.92;
          const borne = Math.max(0, Math.min(titres.length - 1, suivant));
          if (borne !== suivant) vitesse.current = 0;
          cible.current = Math.round(borne);
          return borne;
        }
        const d = cible.current - p;
        if (Math.abs(d) < 0.001) return cible.current;
        return p + d * 0.18;
      });
      id = requestAnimationFrame(pas);
    };
    id = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(id);
  }, [titres.length]);

  // Quand la position s'arrête sur un cran, le parent est prévenu.
  useEffect(() => {
    const arrondi = Math.round(position);
    if (Math.abs(position - arrondi) < 0.01 && titres[arrondi] && titres[arrondi].id !== valeur) {
      onChange(titres[arrondi].id);
    }
  }, [position, titres, valeur, onChange]);

  const aller = useCallback(
    (i: number) => {
      cible.current = Math.max(0, Math.min(titres.length - 1, i));
      vitesse.current = 0;
    },
    [titres.length],
  );

  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    const molette = (e: WheelEvent) => {
      e.preventDefault();
      vitesse.current = Math.max(-0.6, Math.min(0.6, vitesse.current + e.deltaY * 0.0025));
    };
    el.addEventListener("wheel", molette, { passive: false });
    return () => el.removeEventListener("wheel", molette);
  }, []);

  useEffect(() => {
    const mouvement = (y: number) => {
      if (!glisse.current) return;
      const dy = y - dernierY.current;
      dernierY.current = y;
      if (Math.abs(dy) > 2) aBouge.current = true;
      const delta = -dy / 44;
      vitesse.current = delta;
      setPosition((p) => Math.max(0, Math.min(titres.length - 1, p + delta)));
    };
    const souris = (e: MouseEvent) => mouvement(e.clientY);
    const doigt = (e: TouchEvent) => {
      if (!glisse.current) return;
      e.preventDefault();
      mouvement(e.touches[0].clientY);
    };
    const fin = () => {
      if (!glisse.current) return;
      glisse.current = false;
      if (Math.abs(vitesse.current) < 0.05) {
        vitesse.current = 0;
        setPosition((p) => {
          cible.current = Math.round(p);
          return p;
        });
      }
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
  }, [titres.length]);

  const debut = (y: number) => {
    glisse.current = true;
    aBouge.current = false;
    vitesse.current = 0;
    dernierY.current = y;
  };

  return (
    <div
      ref={zone}
      className={styles.roue}
      role="listbox"
      aria-label="Choisir une masterclass"
      aria-activedescendant={`titre-${valeur}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          aller(Math.round(position) + 1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          aller(Math.round(position) - 1);
        }
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        debut(e.clientY);
      }}
      onTouchStart={(e) => debut(e.touches[0].clientY)}
    >
      {titres.map((t, i) => {
        const d = i - position;
        if (Math.abs(d) > VISIBLES) return null;
        const theta = (d * PAS_DEG * Math.PI) / 180;
        // Le centre de l'arc est loin à gauche : les titres s'alignent sur
        // sa droite, comme sur le modèle.
        const x = RAYON * (Math.cos(theta) - 1);
        const y = RAYON * Math.sin(theta);
        const ecart = Math.abs(d);
        const actif = ecart < 0.5;
        return (
          <button
            key={t.id}
            id={`titre-${t.id}`}
            type="button"
            role="option"
            aria-selected={actif}
            className={actif ? styles.actif : styles.titre}
            style={{
              transform: `translate(${x}px, ${y}px) translateY(-50%) rotate(${d * PAS_DEG}deg) scale(${1 - Math.min(ecart, 6) * 0.06})`,
              opacity: Math.max(0.12, 1 - ecart * 0.22),
              filter: ecart > 1.5 ? `blur(${(ecart - 1.5) * 0.5}px)` : undefined,
            }}
            onClick={() => {
              if (!aBouge.current) aller(i);
            }}
            tabIndex={-1}
          >
            <span className={styles.point} aria-hidden="true" />
            <span className={styles.label}>{t.label}</span>
            {t.sous && <span className={styles.sous}>{t.sous}</span>}
          </button>
        );
      })}
    </div>
  );
}
