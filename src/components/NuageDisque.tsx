"use client";

import { useEffect, useMemo, useState } from "react";
import { Pacifico } from "next/font/google";
import { ENGAGEMENTS } from "@/lib/engagements";
import type { MotCle } from "@/app/pitchotheque/actions";
import styles from "./NuageDisque.module.css";

/**
 * Le nuage de mots-clés, dans un vrai dessin de nuage — le même que celui du
 * bouton qui l'ouvre (NuageCouleurs) —, avec les mots dans les quatre
 * couleurs de la marque, à la main levée. C'était d'abord un « G » (un G
 * coloré sur une page de recherche faisait penser à Google), puis le disque
 * du logo ; c'est un nuage depuis le 03/10/2026 (le disque est gardé dans
 * l'historique git).
 *
 * Le nuage est découpé en lignes horizontales ; chaque ligne reçoit les
 * mots qui y tiennent, sans jamais être déformés. La taille de l'ensemble
 * s'ajuste pour que tous les mots trouvent leur place.
 */

const manuscrite = Pacifico({ subsets: ["latin"], weight: "400", display: "swap" });

// Le nuage, dessiné sur une grille de 100 × 64 (comme NuageCouleurs) et
// agrandi pour que les mots y soient lisibles : une base arrondie (une gélule)
// et trois bosses.
const ECHELLE = 14;
const BASE = { gauche: 6, droite: 94, haut: 36, bas: 60 };
const BOSSES: { cx: number; cy: number; r: number }[] = [
  { cx: 30, cy: 38, r: 17 },
  { cx: 52, cy: 28, r: 23 },
  { cx: 73, cy: 40, r: 16 },
];
const HAUT = 28 - 23; // le sommet de la grande bosse
const VUE = `${(BASE.gauche - 2) * ECHELLE} ${(HAUT - 1) * ECHELLE} ${(BASE.droite - BASE.gauche + 4) * ECHELLE} ${(BASE.bas - HAUT + 2) * ECHELLE}`;

const COULEURS = ENGAGEMENTS.map((e) => e.couleur);

type Intervalle = [number, number];

/** La partie d'une ligne horizontale qui tombe dans le nuage. */
function intervallesA(yBrut: number): Intervalle[] {
  const y = yBrut / ECHELLE;
  const parts: Intervalle[] = [];
  // La base : ses deux bouts sont des demi-cercles.
  if (y >= BASE.haut && y <= BASE.bas) {
    const rayon = (BASE.bas - BASE.haut) / 2;
    const dy = Math.abs(y - (BASE.haut + BASE.bas) / 2);
    const retrait = rayon - Math.sqrt(Math.max(0, rayon * rayon - dy * dy));
    parts.push([BASE.gauche + retrait, BASE.droite - retrait]);
  }
  for (const { cx, cy, r } of BOSSES) {
    const dy = y - cy;
    if (Math.abs(dy) < r) {
      const w = Math.sqrt(r * r - dy * dy);
      parts.push([cx - w, cx + w]);
    }
  }
  // Les morceaux qui se recouvrent ne font qu'une seule étendue.
  parts.sort((a, b) => a[0] - b[0]);
  const reunis: Intervalle[] = [];
  for (const [d, f] of parts) {
    const dernier = reunis[reunis.length - 1];
    if (dernier && d <= dernier[1]) dernier[1] = Math.max(dernier[1], f);
    else reunis.push([d, f]);
  }
  return reunis.map(([d, f]) => [d * ECHELLE, f * ECHELLE]);
}

function intersecter(a: Intervalle[], b: Intervalle[]): Intervalle[] {
  const res: Intervalle[] = [];
  for (const [a0, a1] of a)
    for (const [b0, b1] of b) {
      const d = Math.max(a0, b0);
      const f = Math.min(a1, b1);
      if (f > d) res.push([d, f]);
    }
  return res;
}

/** Ce qui, dans une bande, reste dans le disque sur toute sa hauteur. */
function segmentsBande(y0: number, y1: number): Intervalle[] {
  let seg = intervallesA(y0);
  for (let k = 1; k <= 4; k++) seg = intersecter(seg, intervallesA(y0 + ((y1 - y0) * k) / 4));
  return seg;
}

/** Petit générateur pseudo-aléatoire : le même nuage à chaque visite. */
function hasard(graine: number) {
  let s = graine;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

type Place = {
  mot: MotCle;
  x: number;
  y: number;
  taille: number;
  couleur: string;
};

type Mesure = (texte: string, taille: number) => number;

/** « comédie dramatique » s'écrit « Comédie dramatique » dans le nuage. */
const affiche = (label: string) => label.charAt(0).toLocaleUpperCase("fr-FR") + label.slice(1);

// Trois tailles d'écriture, selon le rang du mot : les plus utilisés
// (les 8 premiers %), les suivants (jusqu'à 30 %), puis tous les autres.
const PALIERS = [
  { jusqua: 0.08, taille: 1.9 },
  { jusqua: 0.3, taille: 1.3 },
  { jusqua: 1, taille: 0.85 },
];

/**
 * Remplit le disque ligne après ligne. Chaque ligne a la hauteur d'un palier :
 * les mots les plus utilisés ont leurs propres lignes, plus hautes, et
 * ressortent nettement. Les lignes des trois paliers sont mêlées pour que
 * les gros mots se répartissent sur tout le disque. Chaque mot garde sa
 * forme naturelle : on joue seulement sur les espaces.
 */
function disposer(mots: MotCle[], unite: number, mesure: Mesure) {
  const alea = hasard(11);
  // Les mots arrivent triés du plus au moins utilisé.
  const files = PALIERS.map(() => [] as MotCle[]);
  mots.forEach((m, i) => {
    files[PALIERS.findIndex((p) => i / mots.length < p.jusqua)].push(m);
  });
  for (const f of files) f.sort(() => alea() - 0.5);

  const places: Place[] = [];
  let derniereCouleur = -1;
  let y = HAUT * ECHELLE;

  while (files.some((f) => f.length)) {
    // Le palier de la ligne : tiré au sort, en proportion de ce qu'il
    // reste à placer dans chacun.
    const poids = files.map((f, i) => f.length * PALIERS[i].taille);
    let t = alea() * poids.reduce((x, n) => x + n, 0);
    let palier = 0;
    while (t > poids[palier] || !files[palier].length) {
      t -= poids[palier];
      palier++;
    }
    const taille = unite * PALIERS[palier].taille;
    const hauteur = taille * 1.12;
    if (y + hauteur > BASE.bas * ECHELLE) break;
    const espace = taille * 0.28;

    for (const [a, b] of segmentsBande(y, y + hauteur)) {
      const largeurSeg = b - a;
      const ligne: { mot: MotCle; taille: number; largeur: number }[] = [];
      let occupe = 0;
      // D'abord les mots du palier ; s'il reste de la place, des mots
      // plus petits sur la même ligne.
      for (let q = palier; q < files.length; q++) {
        const tq = unite * PALIERS[q].taille;
        for (;;) {
          const reste = largeurSeg - occupe - (ligne.length ? espace : 0);
          const idx = files[q].findIndex((m) => mesure(m.label, tq) <= reste);
          if (idx < 0) break;
          const [mot] = files[q].splice(idx, 1);
          const largeur = mesure(mot.label, tq);
          occupe += largeur + (ligne.length ? espace : 0);
          ligne.push({ mot, taille: tq, largeur });
        }
      }
      if (!ligne.length) continue;

      const libre = largeurSeg - occupe;
      const entreMots = ligne.length > 1 ? Math.min(libre * 0.5, espace) / (ligne.length - 1) : 0;
      let x = a + (libre - entreMots * (ligne.length - 1)) / 2;
      for (const { mot, taille: tm, largeur } of ligne) {
        let c = Math.floor(alea() * COULEURS.length);
        if (c === derniereCouleur) c = (c + 1) % COULEURS.length;
        derniereCouleur = c;
        places.push({ mot, x, y: y + hauteur * 0.74, taille: tm, couleur: COULEURS[c] });
        x += largeur + espace + entreMots;
      }
    }
    y += hauteur;
  }

  return { places, tousPlaces: files.every((f) => !f.length) };
}

/** Les pièces du nuage, pour le contour comme pour le calcul des lignes. */
function Pieces() {
  const rayon = (BASE.bas - BASE.haut) / 2;
  return (
    <>
      <rect x={BASE.gauche} y={BASE.haut} width={BASE.droite - BASE.gauche} height={BASE.bas - BASE.haut} rx={rayon} />
      {BOSSES.map((b) => (
        <circle key={b.cx} cx={b.cx} cy={b.cy} r={b.r} />
      ))}
    </>
  );
}

/**
 * Un fin contour pour deviner le nuage entre les mots : les pièces sont
 * tracées avec un trait épais, puis recouvertes à la couleur du fond, et il
 * ne reste que le trait qui dépasse.
 */
function Contour() {
  return (
    <g transform={`scale(${ECHELLE})`} aria-hidden="true" pointerEvents="none">
      <g fill="var(--bordure-forte)" stroke="var(--bordure-forte)" strokeWidth={0.4}>
        <Pieces />
      </g>
      <g fill="var(--bg)">
        <Pieces />
      </g>
    </g>
  );
}

export default function NuageDisque({
  mots,
  onChoisir,
}: {
  mots: MotCle[];
  onChoisir?: (label: string) => void;
}) {
  // La police manuscrite doit être chargée avant de mesurer les mots :
  // on recalcule le nuage une fois qu'elle est là.
  const [policePrete, setPolicePrete] = useState(0);
  useEffect(() => {
    let actif = true;
    document.fonts?.ready.then(() => actif && setPolicePrete((n) => n + 1));
    return () => {
      actif = false;
    };
  }, []);

  const places = useMemo(() => {
    if (!mots.length || typeof document === "undefined") return [];
    const ctx = document.createElement("canvas").getContext("2d");
    const famille = manuscrite.style.fontFamily;
    const cache = new Map<string, number>();
    // Largeur mesurée à 100 px, puis proportionnelle à la taille.
    const mesure: Mesure = (texte, taille) => {
      let l = cache.get(texte);
      if (l === undefined) {
        if (ctx) {
          ctx.font = `100px ${famille}`;
          l = ctx.measureText(affiche(texte)).width;
        } else {
          l = texte.length * 55;
        }
        cache.set(texte, l);
      }
      return (l * taille) / 100;
    };

    // La recherche par proximité renvoie les mots dans l'ordre de
    // ressemblance : la taille, elle, suit la fréquence.
    const tries = [...mots].sort((x, y) => y.effectif - x.effectif);

    // La plus grande écriture qui fait tenir tous les mots dans le disque.
    let bas = 10;
    let haut = 140;
    for (let k = 0; k < 16; k++) {
      const milieu = (bas + haut) / 2;
      if (disposer(tries, milieu, mesure).tousPlaces) bas = milieu;
      else haut = milieu;
    }
    return disposer(tries, bas, mesure).places;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mots, policePrete]);

  return (
    <svg
      viewBox={VUE}
      className={`${styles.g} ${manuscrite.className}`}
      role="group"
      aria-label="Nuage de mots-clés"
    >
      <Contour />
      {places.map((p) => (
        <text
          key={p.mot.label}
          x={p.x}
          y={p.y}
          fontSize={p.taille}
          fill={p.couleur}
          className={styles.mot}
          role="button"
          tabIndex={0}
          onClick={() => onChoisir?.(p.mot.label)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChoisir?.(p.mot.label);
            }
          }}
        >
          <title>{`${p.mot.effectif} projet${p.mot.effectif > 1 ? "s" : ""}`}</title>
          {affiche(p.mot.label)}
        </text>
      ))}
    </svg>
  );
}
