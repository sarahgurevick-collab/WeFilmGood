"use client";

import { useEffect, useRef } from "react";
import LogoComplet from "./LogoComplet";
import styles from "./DefilementEngagements.module.css";

/*
 * ESSAI (24/09/2026) — les quatre engagements en défilement horizontal
 * (d'après « horizontal scroll » de Matt Perry, réécrit sans bibliothèque).
 * On descend dans la page : la rangée de panneaux plein écran glisse vers
 * la gauche, et le mot de chaque panneau traverse l'écran un peu plus vite
 * que lui. Page d'accueil d'avant : étiquette git
 * « accueil-avant-scroll-horizontal ».
 *
 * Rouge : le logo seul (le nom fait partie du dessin, on ne le récrit
 * pas). Puis vert, jaune, bleu : for Planet, for Humanity, for Education.
 */
const PANNEAUX = [
  { cle: "wfg", fond: "#DA2C25", texte: "#fff", mot: null },
  { cle: "planet", fond: "#35B05E", texte: "#fff", mot: "Planet" },
  { cle: "humanity", fond: "#F2C230", texte: "#1a1a1a", mot: "Humanity" },
  { cle: "education", fond: "#3B8EF5", texte: "#fff", mot: "Education" },
];

export default function DefilementEngagements() {
  const section = useRef<HTMLElement>(null);
  const rangee = useRef<HTMLUListElement>(null);
  const mots = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const n = PANNEAUX.length;
    let image = 0;

    const peindre = () => {
      image = 0;
      const el = section.current;
      if (!el || !rangee.current) return;
      const r = el.getBoundingClientRect();
      const course = el.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, course)));
      rangee.current.style.transform = `translateX(${-p * (n - 1) * 100}vw)`;
      // Chaque mot traverse son panneau pendant sa part du défilement.
      mots.current.forEach((mot, i) => {
        if (!mot) return;
        const local = p * (n - 1) - i + 0.5; // 0.5 : le panneau est centré
        const x = Math.max(-1, Math.min(1, local)) * -40;
        mot.style.transform = `translateX(${x}vw)`;
      });
    };
    const demander = () => {
      if (!image) image = requestAnimationFrame(peindre);
    };
    peindre();
    window.addEventListener("scroll", demander, { passive: true });
    window.addEventListener("resize", demander);
    return () => {
      window.removeEventListener("scroll", demander);
      window.removeEventListener("resize", demander);
      cancelAnimationFrame(image);
    };
  }, []);

  return (
    <section
      ref={section}
      className={styles.section}
      style={{ height: `${PANNEAUX.length * 100}vh` }}
      aria-label="Nos engagements"
    >
      <div className={styles.collant}>
        <ul ref={rangee} className={styles.rangee} style={{ width: `${PANNEAUX.length * 100}vw` }}>
          {PANNEAUX.map((pan, i) => (
            <li key={pan.cle} className={styles.panneau} style={{ background: pan.fond, color: pan.texte }}>
              {pan.mot ? (
                <h2
                  ref={(el) => {
                    mots.current[i] = el;
                  }}
                  className={styles.mot}
                >
                  <span className={styles.for}>for</span>
                  {pan.mot}
                </h2>
              ) : (
                <div
                  ref={(el) => {
                    mots.current[i] = el;
                  }}
                  className={styles.logo}
                >
                  <LogoComplet hauteur={260} couleur="#fff" />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
