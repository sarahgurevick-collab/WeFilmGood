"use client";

import { useEffect, useRef, useState } from "react";
import formStyles from "@/components/form.module.css";
import styles from "../../blocs.module.css";

/** Le nom du signal envoyé par ChercheurPortrait au formulaire du personnage. */
export const PORTRAIT_CHOISI = "portrait-choisi";
/** Le signal inverse : la croix de la case retire le portrait choisi. */
export const PORTRAIT_RETIRE = "portrait-retire";

/**
 * La case « Portrait » d'un personnage. Un portrait cliqué dans les
 * propositions s'y affiche aussitôt (01/10) ; il n'est enregistré qu'avec
 * le bouton du cadre.
 *
 * On fait glisser la photo dans son cadre pour choisir la partie visible
 * (06/10, demande de Sarah) : la photo est stockée entière, seule la
 * position (photo_x, photo_y, en %) est retenue, avec le même bouton
 * « Enregistrer » que le reste du personnage.
 */
export default function CasePortrait({
  photo,
  x: xInitial = 50,
  y: yInitial = 50,
  proposee = false,
}: {
  photo: string | null;
  x?: number;
  y?: number;
  /** Le portrait a été posé par WeFilmGood, pas choisi par l'auteur. */
  proposee?: boolean;
}) {
  const cadre = useRef<HTMLDivElement>(null);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [x, setX] = useState(xInitial);
  const [y, setY] = useState(yInitial);
  const [bouge, setBouge] = useState(false);
  const [natif, setNatif] = useState<{ l: number; h: number } | null>(null);
  const depart = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  // Un nouveau portrait (proposé, ou fichier choisi dans le formulaire)
  // s'affiche aussitôt, recentré.
  useEffect(() => {
    const formulaire = cadre.current?.closest("form");
    if (!formulaire) return;
    let fichier: string | null = null;
    const nouveau = (url: string | null) => {
      if (fichier) URL.revokeObjectURL(fichier);
      fichier = null;
      setChoisi(url);
      setX(50);
      setY(50);
      setBouge(false);
      setNatif(null);
    };
    const suivre = (e: Event) => nouveau((e as CustomEvent<string | null>).detail);
    const champFichier = formulaire.querySelector<HTMLInputElement>('input[type="file"][name="photo"]');
    const apercu = () => {
      const f = champFichier?.files?.[0];
      if (f) {
        fichier = URL.createObjectURL(f);
        setChoisi(fichier);
        setX(50);
        setY(50);
        setBouge(false);
        setNatif(null);
      }
    };
    formulaire.addEventListener(PORTRAIT_CHOISI, suivre);
    champFichier?.addEventListener("change", apercu);
    return () => {
      formulaire.removeEventListener(PORTRAIT_CHOISI, suivre);
      champFichier?.removeEventListener("change", apercu);
      if (fichier) URL.revokeObjectURL(fichier);
    };
  }, []);

  const image = choisi ?? photo;
  // L'axe où la photo dépasse du cadre carré : c'est le seul qu'on peut déplacer.
  const axe = natif ? (natif.l / natif.h > 1.01 ? "x" : natif.l / natif.h < 0.99 ? "y" : null) : null;

  const debut = (e: React.PointerEvent) => {
    if (!axe) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    depart.current = { px: e.clientX, py: e.clientY, x, y };
  };
  const deplace = (e: React.PointerEvent) => {
    const d = depart.current;
    const z = cadre.current;
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
    <div className={styles.casePortrait}>
      <div
        ref={cadre}
        className={`${styles.portrait} ${axe ? styles.portraitGlisse : ""}`}
        onPointerDown={debut}
        onPointerMove={deplace}
        onPointerUp={fin}
        onPointerCancel={fin}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            draggable={false}
            style={{ objectPosition: `${x}% ${y}%` }}
            onLoad={(e) => setNatif({ l: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          />
        ) : (
          <span>Portrait</span>
        )}
        {/* La croix : retire le portrait qu'on vient de choisir (pas celui
            déjà enregistré), et les propositions reviennent. */}
        {choisi && (
          <button
            type="button"
            className={styles.portraitRetirer}
            aria-label="Retirer ce portrait"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => {
              setChoisi(null);
              setX(xInitial);
              setY(yInitial);
              setBouge(false);
              setNatif(null);
              cadre.current?.closest("form")?.dispatchEvent(new CustomEvent(PORTRAIT_RETIRE));
            }}
          >
            ×
          </button>
        )}
      </div>
      {image && axe && <p className={formStyles.hint}>Glissez l&apos;image pour choisir ce qui s&apos;affiche.</p>}
      {proposee && !choisi && photo && <p className={styles.portraitPropose}>Proposée par WeFilmGood</p>}
      {/* Envoyée seulement si l'auteur a déplacé la photo : sinon, rien ne change. */}
      {bouge && (
        <>
          <input type="hidden" name="photo_x" value={Math.round(x)} />
          <input type="hidden" name="photo_y" value={Math.round(y)} />
        </>
      )}
    </div>
  );
}
