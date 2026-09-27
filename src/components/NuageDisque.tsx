"use client";

import { useEffect, useMemo, useState } from "react";
import { Pacifico } from "next/font/google";
import { ENGAGEMENTS } from "@/lib/engagements";
import type { MotCle } from "@/app/pitchotheque/actions";
import styles from "./NuageDisque.module.css";

/**
 * Le nuage de mots-clés dessiné dans le disque du logo WeFilmGood — le
 * grand rond et son découpage en escalier —, dans les quatre couleurs de
 * la marque, à la main levée. Il remplace le « G » (27/09/2026) : un G
 * coloré sur une page de recherche faisait penser à Google.
 *
 * Le disque est découpé en lignes horizontales ; chaque ligne reçoit les
 * mots qui y tiennent, sans jamais être déformés. La taille de l'ensemble
 * s'ajuste pour que tous les mots trouvent leur place.
 */

const manuscrite = Pacifico({ subsets: ["latin"], weight: "400", display: "swap" });

// Le disque, mesuré sur le fichier du logo (public/label-wfg.png, 1381 × 1113).
const CX = 609.5;
const CY = 560;
const R = 532;
// Les trois marches de l'escalier, en bas à droite : à partir de chaque
// hauteur, le disque s'arrête à cette abscisse.
const MARCHES: [number, number][] = [
  [359, 831],
  [590, 644],
  [823, 445],
];
const VUE = `${CX - R} ${CY - R} ${2 * R} ${2 * R}`;

const COULEURS = ENGAGEMENTS.map((e) => e.couleur);

type Intervalle = [number, number];

/** La partie d'une ligne horizontale qui tombe dans le disque. */
function intervallesA(y: number): Intervalle[] {
  const dy = y - CY;
  if (Math.abs(dy) >= R) return [];
  const W = Math.sqrt(R * R - dy * dy);
  let droite = CX + W;
  for (const [hauteur, limite] of MARCHES) if (y >= hauteur) droite = Math.min(droite, limite);
  return droite > CX - W ? [[CX - W, droite]] : [];
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
  let y = CY - R;

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
    if (y + hauteur > CY + R) break;
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

export default function NuageDisque({
  mots,
  onChoisir,
  icone = false,
}: {
  mots: MotCle[];
  onChoisir?: (label: string) => void;
  /** Le petit disque de la barre de recherche : un simple dessin, rien de cliquable. */
  icone?: boolean;
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

  if (icone) {
    return (
      <svg
        viewBox={VUE}
        className={`${styles.icone} ${manuscrite.className}`}
        aria-hidden="true"
      >
        {places.map((p) => (
          <text key={p.mot.label} x={p.x} y={p.y} fontSize={p.taille} fill={p.couleur}>
            {affiche(p.mot.label)}
          </text>
        ))}
      </svg>
    );
  }

  return (
    <svg
      viewBox={VUE}
      className={`${styles.g} ${manuscrite.className}`}
      role="group"
      aria-label="Mots-clés dans le disque du logo"
    >
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
