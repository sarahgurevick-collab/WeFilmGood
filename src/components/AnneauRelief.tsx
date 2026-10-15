"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./AnneauRelief.module.css";

export type ElementAnneau = {
  id: string;
  /** Ce qui est posé sur l'anneau : un logo, une photo… */
  contenu: ReactNode;
  /** Le nom écrit sous l'anneau quand l'élément est devant. */
  legende?: string;
  /** Un clic ouvre cette page. */
  href?: string;
  /** Un clic appelle ceci (sans href). */
  onClick?: () => void;
};

/**
 * L'anneau en relief, « comme un anneau de Saturne » (15/10/2026, Sarah) :
 * les éléments tournent sur un anneau incliné vu en perspective, grands et
 * nets devant, petits et pâles derrière. On le fait tourner à la souris ou
 * au doigt, il garde son élan, et tourne seul doucement ; il s'arrête
 * quand il n'est pas à l'écran. Un clic sur un élément l'ouvre.
 *
 * Même esprit que la sphère des témoignages et l'orbite de l'adhésion :
 * tout est calculé en deux dimensions (position, taille, transparence),
 * sans 3D du navigateur, pour rester léger.
 */
export default function AnneauRelief({
  elements,
  largeurElement = 180,
  hauteurElement = 120,
  vitesseAuto = 0.12,
  aplatissement = 0.22,
}: {
  elements: ElementAnneau[];
  /** La taille d'un élément de devant, en pixels. */
  largeurElement?: number;
  hauteurElement?: number;
  /** La rotation toute seule, en degrés par image. */
  vitesseAuto?: number;
  /** L'inclinaison de l'anneau : 0 = vu de face (une ligne), 1 = vu de dessus (un cercle). */
  aplatissement?: number;
}) {
  const cadre = useRef<HTMLDivElement | null>(null);
  const [largeur, setLargeur] = useState<number | null>(null);
  const [reduit, setReduit] = useState(false);
  const [aLEcran, setALEcran] = useState(true);
  const [angle, setAngle] = useState(0);
  const vitesse = useRef(0);
  const glisse = useRef(false);
  const aBouge = useRef(false);
  const dernierX = useRef(0);

  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    const mesurer = () => setLargeur(el.clientWidth);
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduit(mq.matches);
    const surMq = (e: MediaQueryListEvent) => setReduit(e.matches);
    mq.addEventListener("change", surMq);
    const io = new IntersectionObserver(([entree]) => setALEcran(entree.isIntersecting));
    io.observe(el);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", surMq);
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    if (reduit || !aLEcran) return;
    let id = 0;
    const pas = () => {
      if (!glisse.current) {
        vitesse.current *= 0.95;
        if (Math.abs(vitesse.current) < 0.01) vitesse.current = 0;
        setAngle((a) => (a + vitesseAuto + vitesse.current) % 360);
      }
      id = requestAnimationFrame(pas);
    };
    id = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(id);
  }, [reduit, aLEcran, vitesseAuto]);

  const mouvement = useCallback((x: number) => {
    if (!glisse.current) return;
    const dx = x - dernierX.current;
    dernierX.current = x;
    if (Math.abs(dx) > 2) aBouge.current = true;
    const delta = Math.max(-6, Math.min(6, dx * 0.35));
    vitesse.current = delta;
    setAngle((a) => (a + delta) % 360);
  }, []);
  useEffect(() => {
    const souris = (e: MouseEvent) => mouvement(e.clientX);
    const doigt = (e: TouchEvent) => {
      if (!glisse.current) return;
      mouvement(e.touches[0].clientX);
    };
    const fin = () => {
      glisse.current = false;
    };
    document.addEventListener("mousemove", souris);
    document.addEventListener("mouseup", fin);
    document.addEventListener("touchmove", doigt, { passive: true });
    document.addEventListener("touchend", fin);
    return () => {
      document.removeEventListener("mousemove", souris);
      document.removeEventListener("mouseup", fin);
      document.removeEventListener("touchmove", doigt);
      document.removeEventListener("touchend", fin);
    };
  }, [mouvement]);

  const debut = (x: number) => {
    glisse.current = true;
    aBouge.current = false;
    vitesse.current = 0;
    dernierX.current = x;
  };

  const n = elements.length;
  if (n === 0) return null;

  // La scène : l'anneau prend la largeur disponible, bornée.
  const scene = Math.min(largeur ?? 0, 900);
  const rayon = Math.max(0, scene / 2 - largeurElement / 2 - 8);
  const hauteurScene = Math.round(rayon * aplatissement * 2 + hauteurElement * 1.25 + 24);

  // Chaque élément : sa place sur le cercle, puis projetée. z vers le
  // spectateur = devant.
  const places = elements.map((e, i) => {
    const a = ((angle + (360 * i) / n) * Math.PI) / 180;
    const x = Math.sin(a) * rayon;
    const z = Math.cos(a) * rayon;
    const devant = (z + rayon) / (2 * rayon || 1); // 0 derrière, 1 devant
    const echelle = 0.5 + 0.5 * devant;
    const opacite = 0.3 + 0.7 * devant;
    const y = -z * aplatissement; // derrière plus haut, devant plus bas
    return { e, x, y, echelle, opacite, devant, z };
  });
  const premier = places.reduce((m, p) => (p.devant > m.devant ? p : m), places[0]);

  if (reduit) {
    return (
      <div ref={cadre} className={styles.zone}>
        <ul className={styles.grillePlate}>
          {elements.map((e) => (
            <li key={e.id} style={{ width: largeurElement, height: hauteurElement }}>
              <Element e={e} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div ref={cadre} className={styles.zone}>
      {largeur !== null && (
        <div
          className={styles.scene}
          style={{ height: hauteurScene }}
          onMouseDown={(e) => {
            e.preventDefault();
            debut(e.clientX);
          }}
          onTouchStart={(e) => debut(e.touches[0].clientX)}
        >
          {places.map((p) => (
            <div
              key={p.e.id}
              className={styles.element}
              style={{
                width: largeurElement,
                height: hauteurElement,
                left: `calc(50% + ${p.x}px)`,
                top: `calc(50% + ${p.y}px)`,
                opacity: p.opacite,
                transform: `translate(-50%, -50%) scale(${p.echelle})`,
                zIndex: Math.round(1000 + p.z),
              }}
            >
              <Element e={p.e} onClickCapture={(ev) => aBouge.current && ev.preventDefault()} />
            </div>
          ))}
        </div>
      )}
      {premier?.e.legende && <p className={styles.legende}>{premier.e.legende}</p>}
    </div>
  );
}

function Element({ e, onClickCapture }: { e: ElementAnneau; onClickCapture?: (ev: React.MouseEvent) => void }) {
  if (e.href) {
    return (
      <Link href={e.href} className={styles.carte} draggable={false} onClickCapture={onClickCapture}>
        {e.contenu}
      </Link>
    );
  }
  if (e.onClick) {
    return (
      <button type="button" className={styles.carte} onClick={e.onClick} onClickCapture={onClickCapture}>
        {e.contenu}
      </button>
    );
  }
  return <div className={styles.carte}>{e.contenu}</div>;
}
