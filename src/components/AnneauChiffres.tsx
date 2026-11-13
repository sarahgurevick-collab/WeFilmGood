"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./AnneauChiffres.module.css";

/**
 * Les chiffres de l'accueil (13/11/2026, Sarah) : un anneau animé pour les
 * talents par métier — les parts d'un même ensemble — et, à côté, les
 * autres chiffres de l'accueil de WFG 1 en nombres qui montent. L'anneau
 * se dessine et les nombres montent quand le bloc arrive à l'écran ; au
 * survol d'une part (ou de sa ligne), le centre montre ce métier.
 */
export type Part = { label: string; n: number };

// Les couleurs du logo (13/11, Sarah : « les couleurs sont tristes ») : le
// rouge, le bleu, le vert et le jaune des engagements (globals.css), puis le
// rose des champs remplis, plus soutenu ici pour se voir sur le blanc.
const COULEURS = ["#da2c25", "#3b8ef5", "#35b05e", "#f2c230", "#f4c0be"];
const RAYON = 80;
const TOUR = 2 * Math.PI * RAYON;
const ECART = 3;
const DUREE = 1400;

/** Le nombre qui monte de zéro, une fois le bloc à l'écran. */
function useMontee(cible: number, lance: boolean): number {
  const [valeur, setValeur] = useState(0);
  useEffect(() => {
    if (!lance) return;
    // Sans animation demandée : le nombre arrive d'un coup.
    const duree = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : DUREE;
    let image = 0;
    const debut = performance.now();
    const pas = (t: number) => {
      const p = Math.min(1, Math.max(0, t - debut) / duree);
      setValeur(Math.round(cible * (1 - Math.pow(1 - p, 3))));
      if (p < 1) image = requestAnimationFrame(pas);
    };
    image = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(image);
  }, [cible, lance]);
  return valeur;
}

function Nombre({ n, lance }: { n: number; lance: boolean }) {
  return <>{useMontee(n, lance).toLocaleString("fr-FR")}</>;
}

export default function AnneauChiffres({
  total,
  libelleTotal,
  parts,
  compteurs,
}: {
  total: number;
  libelleTotal: string;
  parts: Part[];
  compteurs: Part[];
}) {
  const bloc = useRef<HTMLDivElement>(null);
  const [lance, setLance] = useState(false);
  const [survol, setSurvol] = useState<number | null>(null);

  useEffect(() => {
    const el = bloc.current;
    if (!el) return;
    const veille = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setLance(true);
          veille.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    veille.observe(el);
    return () => veille.disconnect();
  }, []);

  const somme = parts.reduce((s, p) => s + p.n, 0) || 1;
  const arcs = parts.map((p, i) => {
    const avant = parts.slice(0, i).reduce((t, q) => t + q.n, 0);
    return {
      ...p,
      i,
      depart: (avant / somme) * TOUR,
      longueur: Math.max((p.n / somme) * TOUR - ECART, 1),
    };
  });

  const centre = survol === null ? { label: libelleTotal, n: total } : parts[survol];

  return (
    <div ref={bloc} className={`${styles.bloc} ${lance ? styles.lance : ""}`}>
      <div className={styles.haut}>
        <div className={styles.anneau}>
          <svg viewBox="0 0 200 200" role="img" aria-label={`${libelleTotal} : ${total.toLocaleString("fr-FR")}`}>
            <g transform="rotate(-90 100 100)">
              {arcs.map((a) => (
                <circle
                  key={a.label}
                  cx="100"
                  cy="100"
                  r={RAYON}
                  fill="none"
                  stroke={COULEURS[a.i % COULEURS.length]}
                  strokeWidth={survol === a.i ? 26 : 20}
                  strokeDasharray={`${lance ? a.longueur : 0} ${TOUR}`}
                  strokeDashoffset={-a.depart}
                  className={styles.arc}
                  style={{
                    transitionDelay: lance && survol === null ? `${a.i * 0.12}s` : "0s",
                    opacity: survol === null || survol === a.i ? 1 : 0.3,
                  }}
                  onMouseEnter={() => setSurvol(a.i)}
                  onMouseLeave={() => setSurvol(null)}
                />
              ))}
            </g>
          </svg>
          <div className={styles.centre} aria-hidden="true">
            <strong>
              {survol === null ? <Nombre n={centre.n} lance={lance} /> : centre.n.toLocaleString("fr-FR")}
            </strong>
            <span>{centre.label}</span>
          </div>
        </div>

        <ul className={styles.legende}>
          {parts.map((p, i) => (
            <li
              key={p.label}
              className={survol === i ? styles.actif : ""}
              onMouseEnter={() => setSurvol(i)}
              onMouseLeave={() => setSurvol(null)}
            >
              <i style={{ background: COULEURS[i % COULEURS.length] }} />
              <span>{p.label}</span>
              <strong>
                <Nombre n={p.n} lance={lance} />
              </strong>
            </li>
          ))}
        </ul>
      </div>

      <ul className={styles.compteurs}>
        {compteurs.map((c) => (
          <li key={c.label}>
            <strong>
              <Nombre n={c.n} lance={lance} />
            </strong>
            <span>{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
