"use client";

import { useAnimationFrame, useMotionValue, useReducedMotion, motion } from "framer-motion";
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import placeholders from "@/styles/placeholders.module.css";
import styles from "./SpherePhotos.module.css";

const PLACEHOLDERS = [
  placeholders.ph0,
  placeholders.ph1,
  placeholders.ph2,
  placeholders.ph3,
  placeholders.ph4,
  placeholders.ph5,
];

export type PhotoSphereItem = {
  id: string;
  src?: string | null;
  alt: string;
  titre?: string;
  description?: string;
};

/** Répartit `n` points régulièrement sur une sphère de rayon `rayon` (méthode de Fibonacci). */
function pointsSphere(n: number, rayon: number) {
  const points: { x: number; y: number; z: number }[] = [];
  const offset = 2 / n;
  const increment = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = i * offset - 1 + offset / 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = i * increment;
    points.push({
      x: Math.cos(phi) * r * rayon,
      y: y * rayon,
      z: Math.sin(phi) * r * rayon,
    });
  }
  return points;
}

export default function SpherePhotos({
  photos,
  taille = 520,
  rayon = 190,
}: {
  photos: PhotoSphereItem[];
  taille?: number;
  rayon?: number;
}) {
  const reduit = useReducedMotion();
  const points = useMemo(() => pointsSphere(photos.length, rayon), [photos.length, rayon]);
  const [survole, setSurvole] = useState<PhotoSphereItem | null>(null);

  const rotX = useMotionValue(-12);
  const rotY = useMotionValue(0);
  const vitesse = useRef({ x: 0, y: 0.08 });
  const enGlissement = useRef(false);
  const dernierPoint = useRef<{ x: number; y: number } | null>(null);

  useAnimationFrame(() => {
    if (reduit || enGlissement.current) return;
    vitesse.current.x *= 0.94;
    vitesse.current.y += (0.08 - vitesse.current.y) * 0.015;
    rotX.set(rotX.get() + vitesse.current.x);
    rotY.set(rotY.get() + vitesse.current.y);
  });

  function surPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    enGlissement.current = true;
    dernierPoint.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function surPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!enGlissement.current || !dernierPoint.current) return;
    const dx = e.clientX - dernierPoint.current.x;
    const dy = e.clientY - dernierPoint.current.y;
    dernierPoint.current = { x: e.clientX, y: e.clientY };
    vitesse.current = { x: -dy * 0.4, y: dx * 0.4 };
    rotX.set(rotX.get() - dy * 0.4);
    rotY.set(rotY.get() + dx * 0.4);
  }

  function surPointerUp() {
    enGlissement.current = false;
    dernierPoint.current = null;
  }

  if (reduit) {
    return (
      <div className={styles.zone}>
        <div className={styles.grillePlate}>
          {photos.map((photo, i) => (
            <Vignette key={photo.id} photo={photo} index={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.zone}>
      <div
        className={styles.scene}
        style={{ width: taille, height: taille }}
        onPointerDown={surPointerDown}
        onPointerMove={surPointerMove}
        onPointerUp={surPointerUp}
        onPointerLeave={surPointerUp}
      >
        <motion.div className={styles.monde} style={{ rotateX: rotX, rotateY: rotY }}>
          {photos.map((photo, i) => {
            const p = points[i];
            return (
              <div
                key={photo.id}
                className={styles.point}
                style={{ transform: `translate3d(${p.x}px, ${p.y}px, ${p.z}px) translate(-50%, -50%)` }}
                onPointerEnter={() => setSurvole(photo)}
                onPointerLeave={() => setSurvole((s) => (s?.id === photo.id ? null : s))}
              >
                <Vignette photo={photo} index={i} />
              </div>
            );
          })}
        </motion.div>
      </div>

      <div className={styles.legende}>
        {survole ? (
          <>
            {survole.titre && <p className={styles.legendeTitre}>{survole.titre}</p>}
            {survole.description && (
              <p className={styles.legendeTexte}>&laquo;&nbsp;{survole.description}&nbsp;&raquo;</p>
            )}
          </>
        ) : (
          <p className={styles.legendeIndice}>
            Faites glisser la sphère, ou passez sur une photo pour lire le témoignage.
          </p>
        )}
      </div>
    </div>
  );
}

function Vignette({ photo, index }: { photo: PhotoSphereItem; index: number }) {
  const fond = photo.src ? { backgroundImage: `url("${photo.src}")` } : undefined;
  const classe = photo.src
    ? styles.vignette
    : `${styles.vignette} ${PLACEHOLDERS[index % PLACEHOLDERS.length]}`;
  return <div className={classe} style={fond} title={photo.alt} />;
}
