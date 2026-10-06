"use client";

import { useRef, useState, type ReactNode } from "react";
import formStyles from "@/components/form.module.css";
import styles from "./portraits.module.css";

/**
 * Une photo dans son cadre carré, qu'on fait glisser avec la souris ou le
 * doigt pour choisir la partie visible (06/10, demande de Sarah : le faire
 * directement dans l'écran Portraits, là où elle travaille). Le cadrage part
 * avec le formulaire (photo_x, photo_y, en %), seulement si on a bougé la
 * photo ; `enfants` (le bouton d'enregistrement) n'apparaît qu'à ce moment-là.
 */
export default function CadreGlissant({
  src,
  x: xInitial,
  y: yInitial,
  enfants,
  sauve,
}: {
  src: string;
  x: number;
  y: number;
  enfants?: ReactNode;
  /** Le cadrage déjà enregistré (« x,y ») : s'il est celui qu'on voit, le bouton laisse place à « Cadrage enregistré ». */
  sauve?: string | null;
}) {
  const zone = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(xInitial);
  const [y, setY] = useState(yInitial);
  const [bouge, setBouge] = useState(false);
  const [natif, setNatif] = useState<{ l: number; h: number } | null>(null);
  const depart = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  // L'axe où la photo dépasse du cadre carré : c'est le seul qu'on peut déplacer.
  const axe = natif ? (natif.l / natif.h > 1.01 ? "x" : natif.l / natif.h < 0.99 ? "y" : null) : null;

  const debut = (e: React.PointerEvent) => {
    if (!axe) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    depart.current = { px: e.clientX, py: e.clientY, x, y };
  };
  const deplace = (e: React.PointerEvent) => {
    const d = depart.current;
    const z = zone.current;
    if (!d || !z || !natif) return;
    const w = z.clientWidth;
    const h = z.clientHeight;
    // Taille de la photo affichée (elle couvre le cadre) et de ce qui dépasse.
    const echelle = Math.max(w / natif.l, h / natif.h);
    const depasseX = natif.l * echelle - w;
    const depasseY = natif.h * echelle - h;
    if (axe === "x" && depasseX > 0) {
      setX(Math.min(100, Math.max(0, d.x - ((e.clientX - d.px) / depasseX) * 100)));
    }
    if (axe === "y" && depasseY > 0) {
      setY(Math.min(100, Math.max(0, d.y - ((e.clientY - d.py) / depasseY) * 100)));
    }
    setBouge(true);
  };
  const fin = () => {
    depart.current = null;
  };

  return (
    <>
      <div
        ref={zone}
        className={`${styles.cadre} ${axe ? styles.cadreGlisse : ""}`}
        onPointerDown={debut}
        onPointerMove={deplace}
        onPointerUp={fin}
        onPointerCancel={fin}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          style={{ objectPosition: `${x}% ${y}%` }}
          // Une photo déjà chargée avant que la page ne s'active ne déclenche
          // plus « onLoad » : on lit alors ses dimensions tout de suite.
          ref={(img) => {
            if (img && img.complete && img.naturalWidth > 0) {
              setNatif((n) => n ?? { l: img.naturalWidth, h: img.naturalHeight });
            }
          }}
          onLoad={(e) => setNatif({ l: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        />
      </div>
      {axe && <p className={formStyles.hint}>Glissez l&apos;image pour choisir ce qui s&apos;affiche.</p>}
      {bouge && (
        <>
          <input type="hidden" name="photo_x" value={Math.round(x)} />
          <input type="hidden" name="photo_y" value={Math.round(y)} />
          {sauve === `${Math.round(x)},${Math.round(y)}` ? (
            <p className={styles.sauve}>Cadrage enregistré</p>
          ) : (
            enfants
          )}
        </>
      )}
    </>
  );
}
