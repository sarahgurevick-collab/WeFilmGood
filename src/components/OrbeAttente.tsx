"use client";

import { useEffect, useRef } from "react";

/**
 * L'orbe d'attente : une sphère de points qui tourne lentement, parcourue
 * de reflets, dans la couleur du moment (celle du logo et des boutons).
 *
 * Essai demandé par Sarah le 29/10 d'après « AI thinking orb » d'anark17r
 * (21st.dev). Le code d'origine n'est pas accessible ; la recette est
 * reprise du bundle : 16 anneaux de points en spirale, inclinaison de
 * 0,35 rad, perspective 2,8, deux projecteurs qui se promènent et une
 * bande horizontale qui balaie la sphère. L'escalier rouge (MarcheRouge)
 * est gardé de côté : étiquette git chargement-escalier-avant-orbe.
 */
const ANNEAUX = 16;
const DEUX_PI = Math.PI * 2;

type Point = { x: number; y: number; z: number; graine: number };

const POINTS: Point[] = (() => {
  const pts: Point[] = [];
  let g = 7;
  const alea = () => ((g = (g * 16807) % 2147483647) / 2147483647);
  for (let a = 0; a < ANNEAUX; a++) {
    const y = 1 - ((a + 0.5) / ANNEAUX) * 2;
    const r = Math.sqrt(1 - y * y);
    const n = Math.max(4, Math.round(30 * r));
    for (let i = 0; i < n; i++) {
      const t = (i / n) * DEUX_PI + a * 0.35;
      pts.push({ x: Math.cos(t) * r, y, z: Math.sin(t) * r, graine: alea() * DEUX_PI });
    }
  }
  return pts;
})();

const INCLINAISON = 0.35;
const COS_I = Math.cos(INCLINAISON);
const SIN_I = Math.sin(INCLINAISON);

export default function OrbeAttente({ taille = 140, libelle = "Chargement" }: { taille?: number; libelle?: string }) {
  const toile = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = toile.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(taille * dpr);
    c.height = Math.round(taille * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const centre = taille / 2;
    const rayon = taille * 0.4;
    const grosseur = taille * 0.0125;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let t = 1.2;
    let avant = performance.now();
    let demande = 0;

    const dessiner = () => {
      ctx.clearRect(0, 0, taille, taille);
      ctx.fillStyle = getComputedStyle(c).color;
      const theta = t * 0.7;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      // Deux projecteurs qui se promènent, et une bande qui monte et descend.
      const a1 = t * 0.8, e1 = Math.sin(t * 0.5) * 0.9;
      const p1 = [Math.cos(e1) * Math.cos(a1), Math.sin(e1), Math.cos(e1) * Math.sin(a1)];
      const a2 = t * 0.55 + 2.1, e2 = Math.cos(t * 0.42) * 0.9;
      const p2 = [Math.cos(e2) * Math.cos(a2), Math.sin(e2), Math.cos(e2) * Math.sin(a2)];
      const bande = Math.sin(t * 2.2);

      const ecran = POINTS.map((p) => {
        const mx = p.x * cosT + p.z * sinT;
        const mz = -p.x * sinT + p.z * cosT;
        const my = p.y * COS_I - mz * SIN_I;
        const prof = p.y * SIN_I + mz * COS_I; // -1 (fond) → 1 (devant)
        const persp = 2.8 / (2.8 - prof);
        const devant = (prof + 1) / 2;
        const l1 = Math.max(0, (p.x * p1[0] + p.y * p1[1] + p.z * p1[2] - 0.72) / 0.28);
        const l2 = Math.max(0, (p.x * p2[0] + p.y * p2[1] + p.z * p2[2] - 0.72) / 0.28);
        const db = p.y - bande;
        const lb = Math.max(0, 1 - (db * db) / 0.02);
        const reflet = Math.max(l1 * l1, l2 * l2, 0.5 * lb * lb);
        let alpha = 0.3 + 0.05 * Math.sin(p.graine + t * 1.6) + 0.45 * devant * devant + 0.6 * reflet;
        if (alpha > 1) alpha = 1;
        return {
          x: centre + mx * rayon * persp,
          y: centre - my * rayon * persp,
          r: grosseur * (0.45 + 0.75 * devant) * persp * (1 + 0.9 * reflet),
          alpha,
          devant,
        };
      });
      // Le fond d'abord, le devant ensuite.
      for (const passe of [0, 1]) {
        for (const e of ecran) {
          if ((e.devant >= 0.5) !== (passe === 1)) continue;
          ctx.globalAlpha = e.alpha;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r, 0, DEUX_PI);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    const image = (maintenant: number) => {
      t += Math.min(0.05, (maintenant - avant) / 1000);
      avant = maintenant;
      dessiner();
      demande = requestAnimationFrame(image);
    };

    if (reduit) dessiner();
    else demande = requestAnimationFrame(image);
    return () => cancelAnimationFrame(demande);
  }, [taille]);

  return (
    <span
      role="status"
      aria-label={libelle}
      style={{ display: "inline-block", width: taille, height: taille, lineHeight: 0, color: "var(--engagement, #da2c25)" }}
    >
      <canvas ref={toile} style={{ width: taille, height: taille }} aria-hidden="true" />
    </span>
  );
}
