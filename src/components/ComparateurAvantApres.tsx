"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import styles from "./ComparateurFestivals.module.css";

/*
 * Comparateur « avant / après » entre deux côtés (d'après Compare Reveal de
 * Motiq, licence MIT, réécrit sans Tailwind). La barre suit le doigt ou la
 * souris avec un ressort ; à l'arrivée à l'écran, elle fait une fois un
 * aller-retour pour montrer qu'on peut la tirer. Double-clic : retour au
 * milieu. Au clavier : flèches (2 %), Maj + flèches (10 %), Début / Fin.
 *
 * `onCote` prévient quand le côté le plus visible change : la page s'en
 * sert pour afficher le court ou le long métrage en dessous.
 */

const RAIDEUR = 140;
const AMORTI = 18;
const BALAYAGE_S = 2.6;
const PAS = 2;
const GRAND_PAS = 10;
const ETIQUETTE_MASQUEE = 12;

const borne = (v: number) => Math.min(100, Math.max(0, v));
const entre = (a: number, b: number, t: number) => a + (b - a) * t;
const adoucir = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** L'aller-retour de démonstration : 50 → 96 → 4 → 50. */
function balayage(u: number) {
  if (u < 0.38) return entre(50, 96, adoucir(u / 0.38));
  if (u < 0.78) return entre(96, 4, adoucir((u - 0.38) / 0.4));
  return entre(4, 50, adoucir((u - 0.78) / 0.22));
}

export default function ComparateurFestivals({
  gauche,
  droite,
  etiquettes,
  onCote,
}: {
  gauche: ReactNode;
  droite: ReactNode;
  etiquettes: [string, string];
  onCote?: (cote: "gauche" | "droite") => void;
}) {
  const cadre = useRef<HTMLDivElement>(null);
  const dessus = useRef<HTMLDivElement>(null);
  const barre = useRef<HTMLDivElement>(null);
  const poignee = useRef<HTMLButtonElement>(null);
  const etiquettesRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [position, setPosition] = useState(50);
  const [visible, setVisible] = useState(false);

  const sim = useRef({ x: 50, v: 0, cible: 50, glisse: false, doigt: -1, demo: false, demoFaite: false, debut: 0 });
  const dernierCote = useRef<"gauche" | "droite" | null>(null);
  const rappel = useRef(onCote);
  useEffect(() => {
    rappel.current = onCote;
  }, [onCote]);

  // N'anime que lorsqu'il est à l'écran.
  useEffect(() => {
    const el = cadre.current;
    if (!el) return;
    const obs = new IntersectionObserver((e) => setVisible(e.some((x) => x.isIntersecting)), {
      threshold: 0.2,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const peindre = () => {
      const x = borne(sim.current.x);
      if (dessus.current) dessus.current.style.clipPath = `inset(0 ${(100 - x).toFixed(3)}% 0 0)`;
      if (barre.current) barre.current.style.left = `${x.toFixed(3)}%`;
      poignee.current?.setAttribute("aria-valuenow", String(Math.round(x)));
      const [e0, e1] = etiquettesRefs.current;
      if (e0) e0.style.opacity = x > ETIQUETTE_MASQUEE ? "1" : "0";
      if (e1) e1.style.opacity = x < 100 - ETIQUETTE_MASQUEE ? "1" : "0";
    };
    peindre();

    const moinsDeMouvement = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!visible || moinsDeMouvement) {
      sim.current.x = sim.current.cible;
      peindre();
      return;
    }

    const s = sim.current;
    if (!s.demoFaite) {
      s.demo = true;
      s.debut = performance.now() / 1000;
    }

    let image = 0;
    let avant = performance.now();
    const tour = (t: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (t - avant) / 1000));
      avant = t;
      if (s.demo) {
        const u = (t / 1000 - s.debut) / BALAYAGE_S;
        if (u >= 1) {
          s.demo = false;
          s.demoFaite = true;
          s.cible = 50;
        } else {
          s.cible = balayage(u);
        }
      }
      s.v += ((s.cible - s.x) * RAIDEUR - s.v * AMORTI) * dt;
      s.x = borne(s.x + s.v * dt);
      peindre();
      image = requestAnimationFrame(tour);
    };
    image = requestAnimationFrame(tour);
    return () => {
      cancelAnimationFrame(image);
      // Interrompue en route, la démonstration sera rejouée au retour.
      if (s.demo) {
        s.demo = false;
        s.demoFaite = false;
        s.cible = 50;
      }
    };
  }, [visible]);

  const fixer = (valeur: number) => {
    const v = borne(valeur);
    const s = sim.current;
    s.demo = false;
    s.demoFaite = true;
    s.cible = v;
    setPosition(v);
    // Le côté le plus visible choisit ce que la page montre dessous.
    const cote = v >= 50 ? "gauche" : "droite";
    if (Math.abs(v - 50) > 8 && cote !== dernierCote.current) {
      dernierCote.current = cote;
      rappel.current?.(cote);
    }
  };

  const depuisPointeur = (clientX: number) => {
    const r = cadre.current?.getBoundingClientRect();
    if (r) fixer(((clientX - r.left) / Math.max(1, r.width)) * 100);
  };

  const appui = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    sim.current.glisse = true;
    sim.current.doigt = e.pointerId;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    depuisPointeur(e.clientX);
  };
  const deplacement = (e: PointerEvent<HTMLDivElement>) => {
    if (sim.current.glisse && e.pointerId === sim.current.doigt) depuisPointeur(e.clientX);
  };
  const lacher = () => {
    sim.current.glisse = false;
    sim.current.doigt = -1;
  };

  const clavier = (e: KeyboardEvent<HTMLButtonElement>) => {
    const pas = e.shiftKey ? GRAND_PAS : PAS;
    const base = sim.current.cible;
    let suite: number;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") suite = base + pas;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") suite = base - pas;
    else if (e.key === "Home") suite = 0;
    else if (e.key === "End") suite = 100;
    else return;
    e.preventDefault();
    fixer(suite);
  };

  const affiche = Math.round(position);

  return (
    <div
      ref={cadre}
      role="group"
      aria-label={`${etiquettes[0]} ou ${etiquettes[1]}`}
      className={styles.cadre}
      onPointerDown={appui}
      onPointerMove={deplacement}
      onPointerUp={lacher}
      onPointerCancel={lacher}
      onDoubleClick={() => fixer(50)}
    >
      <div className={styles.cote}>{droite}</div>
      <div ref={dessus} className={styles.cote} style={{ clipPath: `inset(0 ${100 - affiche}% 0 0)` }}>
        {gauche}
      </div>

      {etiquettes.map((texte, i) => (
        <span
          key={texte}
          ref={(el) => {
            etiquettesRefs.current[i] = el;
          }}
          aria-hidden="true"
          className={`${styles.etiquette} ${i === 0 ? styles.etiquetteGauche : styles.etiquetteDroite}`}
        >
          {texte}
        </span>
      ))}

      <div ref={barre} className={styles.barre} style={{ left: `${affiche}%` }}>
        <button
          ref={poignee}
          type="button"
          role="slider"
          aria-label={`Glisser entre ${etiquettes[0]} et ${etiquettes[1]}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={affiche}
          onKeyDown={clavier}
          className={styles.poignee}
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
            <path d="M6 1 L1 7 L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 1 L17 7 L12 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
