"use client";

import { useEffect, useMemo, useState } from "react";
import { Pacifico } from "next/font/google";
import { ENGAGEMENTS } from "@/lib/engagements";
import type { MotCle } from "@/app/projets/actions";
import styles from "./NuageG.module.css";

/**
 * Le nuage de mots-clés dessiné en forme de « G » — le G de WeFilmGood —
 * dans les quatre couleurs de la marque, à la main levée.
 *
 * Le G est découpé en lignes horizontales ; chaque ligne reçoit les mots
 * qui tiennent dans la lettre, sans jamais être déformés. La taille de
 * l'ensemble s'ajuste pour que tous les mots trouvent leur place.
 */

const manuscrite = Pacifico({ subsets: ["latin"], weight: "400", display: "swap" });

const TAILLE = 1000;
const CX = 500;
const CY = 500;
const R = 490; // rayon extérieur
const r = 270; // rayon intérieur
// La barre du G : part du centre et rejoint l'anneau sur la droite.
const BARRE_HAUT = CY - 20;
const BARRE_BAS = CY + 110;
const BARRE_GAUCHE = CX + 20;

const COULEURS = ENGAGEMENTS.map((e) => e.couleur);

type Intervalle = [number, number];

/** Les parties d'une ligne horizontale qui tombent dans le G. */
function intervallesA(y: number): Intervalle[] {
  const dy = y - CY;
  const parts: Intervalle[] = [];
  if (Math.abs(dy) < R) {
    const W = Math.sqrt(R * R - dy * dy);
    if (Math.abs(dy) < r) {
      const w = Math.sqrt(r * r - dy * dy);
      parts.push([CX - W, CX - w], [CX + w, CX + W]);
    } else {
      parts.push([CX - W, CX + W]);
    }
  }
  // L'ouverture du G, en haut à droite, coupée à 45°.
  const coupees: Intervalle[] = [];
  for (const [a, b] of parts) {
    if (dy < 0) {
      const limite = CX + Math.abs(dy) * 0.9;
      if (a < limite) coupees.push([a, Math.min(b, limite)]);
    } else {
      coupees.push([a, b]);
    }
  }
  // La barre horizontale.
  if (y >= BARRE_HAUT && y <= BARRE_BAS && Math.abs(dy) < R) {
    coupees.push([BARRE_GAUCHE, CX + Math.sqrt(R * R - dy * dy)]);
  }
  return fusionner(coupees);
}

function fusionner(parts: Intervalle[]): Intervalle[] {
  const tries = parts.filter(([a, b]) => b > a).sort((p, q) => p[0] - q[0]);
  const res: Intervalle[] = [];
  for (const p of tries) {
    const der = res[res.length - 1];
    if (der && p[0] <= der[1]) der[1] = Math.max(der[1], p[1]);
    else res.push([...p]);
  }
  return res;
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

/** Ce qui, dans une bande, reste dans le G sur toute sa hauteur. */
function segmentsBande(y0: number, y1: number): Intervalle[] {
  let seg = intervallesA(y0);
  for (let k = 1; k <= 4; k++) seg = intersecter(seg, intervallesA(y0 + ((y1 - y0) * k) / 4));
  return seg;
}

/** Petit générateur pseudo-aléatoire : le même G à chaque visite. */
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

/** « comédie dramatique » s'écrit « Comédie dramatique » dans le G. */
const affiche = (label: string) => label.charAt(0).toLocaleUpperCase("fr-FR") + label.slice(1);

/**
 * Remplit le G ligne après ligne. Toutes les lignes ont la même hauteur,
 * comme sur une page d'écriture ; ce sont les mots qui changent de
 * taille selon leur fréquence. Chaque mot garde sa forme naturelle : on
 * joue seulement sur les espaces pour centrer la ligne dans le G.
 */
function disposer(mots: MotCle[], unite: number, mesure: Mesure) {
  const max = Math.max(1, ...mots.map((m) => m.effectif));
  const min = Math.min(...mots.map((m) => m.effectif));
  const tailleDe = (m: MotCle) =>
    unite * (0.72 + 0.38 * (max === min ? 0.5 : (m.effectif - min) / (max - min)));

  // L'ordre de passage est mêlé (toujours de la même façon) pour que les
  // grands mots se répartissent sur toute la lettre.
  const alea = hasard(11);
  const file = [...mots].sort(() => alea() - 0.5);

  const places: Place[] = [];
  const espace = unite * 0.28;
  let derniereCouleur = -1;

  for (let y = CY - R; y + unite <= CY + R && file.length; y += unite) {
    for (const [a, b] of segmentsBande(y, y + unite)) {
      const largeurSeg = b - a;
      const ligne: { mot: MotCle; taille: number; largeur: number }[] = [];
      let occupe = 0;
      for (;;) {
        const reste = largeurSeg - occupe - (ligne.length ? espace : 0);
        const idx = file.findIndex((m) => mesure(m.label, tailleDe(m)) <= reste);
        if (idx < 0) break;
        const [mot] = file.splice(idx, 1);
        const taille = tailleDe(mot);
        const largeur = mesure(mot.label, taille);
        occupe += largeur + (ligne.length ? espace : 0);
        ligne.push({ mot, taille, largeur });
      }
      if (!ligne.length) continue;

      // Le reste de place se répartit en partie entre les mots, le
      // surplus de part et d'autre : la ligne reste compacte.
      const libre = largeurSeg - occupe;
      const entreMots = ligne.length > 1 ? Math.min(libre * 0.5, espace) / (ligne.length - 1) : 0;
      let x = a + (libre - entreMots * (ligne.length - 1)) / 2;
      for (const { mot, taille, largeur } of ligne) {
        let c = Math.floor(alea() * COULEURS.length);
        if (c === derniereCouleur) c = (c + 1) % COULEURS.length;
        derniereCouleur = c;
        places.push({ mot, x, y: y + unite * 0.78, taille, couleur: COULEURS[c] });
        x += largeur + espace + entreMots;
      }
    }
  }

  return { places, tousPlaces: file.length === 0 };
}

export default function NuageG({
  mots,
  onChoisir,
}: {
  mots: MotCle[];
  onChoisir: (label: string) => void;
}) {
  // La police manuscrite doit être chargée avant de mesurer les mots :
  // on recalcule le G une fois qu'elle est là.
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

    // La plus grande écriture qui fait tenir tous les mots dans le G.
    let bas = 10;
    let haut = 140;
    for (let k = 0; k < 16; k++) {
      const milieu = (bas + haut) / 2;
      if (disposer(mots, milieu, mesure).tousPlaces) bas = milieu;
      else haut = milieu;
    }
    return disposer(mots, bas, mesure).places;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mots, policePrete]);

  return (
    <svg
      viewBox={`0 0 ${TAILLE} ${TAILLE}`}
      className={`${styles.g} ${manuscrite.className}`}
      role="group"
      aria-label="Mots-clés en forme de G"
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
          onClick={() => onChoisir(p.mot.label)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChoisir(p.mot.label);
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
