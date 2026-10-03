"use client";

import { useEffect, useRef, useState } from "react";
import formStyles from "@/components/form.module.css";
import styles from "../../blocs.module.css";
import cadre from "./ImagePresentation.module.css";

const RATIO = 16 / 9;

/**
 * L'image de présentation : on voit tout de suite l'image choisie (avant
 * l'enregistrement), et on la fait glisser dans le cadre 16/9 pour choisir
 * la partie visible quand elle est plus grande que la vignette (03/10,
 * demande de Sarah). La position part avec le formulaire (vignette_x,
 * vignette_y, en %), et le serveur recadre.
 */
export default function ImagePresentation({
  urlActuelle,
  accept,
  aUneImage,
}: {
  /** L'image complète déjà enregistrée (l'origine si elle existe), ou null. */
  urlActuelle: string | null;
  accept: string;
  aUneImage: boolean;
}) {
  const [choisie, setChoisie] = useState<string | null>(null);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [bouge, setBouge] = useState(false);
  const [natif, setNatif] = useState<{ l: number; h: number } | null>(null);
  const zone = useRef<HTMLDivElement>(null);
  const depart = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (choisie) URL.revokeObjectURL(choisie);
    };
  }, [choisie]);

  const url = choisie ?? urlActuelle;
  // L'axe où l'image dépasse du cadre : c'est le seul qu'on peut déplacer.
  const axe = natif ? (natif.l / natif.h > RATIO + 0.01 ? "x" : natif.l / natif.h < RATIO - 0.01 ? "y" : null) : null;

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
    // Taille de l'image affichée (couvre le cadre) et de ce qui dépasse.
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
      {url && (
        <div
          ref={zone}
          className={`${styles.apercu} ${axe ? cadre.glisse : ""}`}
          onPointerDown={debut}
          onPointerMove={deplace}
          onPointerUp={fin}
          onPointerCancel={fin}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            draggable={false}
            style={{ objectPosition: `${x}% ${y}%` }}
            onLoad={(e) => setNatif({ l: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          />
        </div>
      )}
      {url && axe && <p className={formStyles.hint}>Glissez l&apos;image pour choisir ce qui s&apos;affiche.</p>}
      <label className={formStyles.field}>
        <span>{aUneImage ? "Remplacer l'image" : "Choisir une image"}</span>
        <input
          type="file"
          name="vignette"
          accept={accept}
          onChange={(e) => {
            const f = e.target.files?.[0];
            setChoisie(f ? URL.createObjectURL(f) : null);
            setX(50);
            setY(50);
            setBouge(false);
            setNatif(null);
          }}
        />
        <span className={formStyles.hint}>Inutile de la compresser : nous nous en chargeons.</span>
      </label>
      {/* Envoyée seulement si l'auteur a déplacé l'image : sinon, rien ne change. */}
      {bouge && (
        <>
          <input type="hidden" name="vignette_x" value={Math.round(x)} />
          <input type="hidden" name="vignette_y" value={Math.round(y)} />
        </>
      )}
    </>
  );
}
