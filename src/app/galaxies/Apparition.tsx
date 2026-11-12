"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./duo.module.css";

/**
 * Une carte des Galaxies qui sort du Finder (12/11/2026, idée de Sarah,
 * d'après « Perspective Tunnel Hero » de 21st.dev) : elle part de la barre
 * de recherche, minuscule, grossit en venant vers nous et va se poser à sa
 * place, deux par deux.
 *
 * Elle ne part que lorsque sa place entre dans l'écran, pour que l'effet
 * soit toujours vu, et lentement. Les cartes partent l'une après l'autre :
 * `prochainDepart` est l'heure à laquelle la suivante a le droit de partir.
 */
const DUREE = 2400;
const ECART = 450;
let prochainDepart = 0;

export default function Apparition({ children, rang }: { children: ReactNode; rang: number }) {
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const barre = document.querySelector("[data-finder-barre]");
    if (!barre || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add(styles.vu);
      return;
    }

    let vol: Animation | null = null;
    const partir = () => {
      const maintenant = performance.now();
      const attente = Math.max(0, prochainDepart - maintenant);
      prochainDepart = maintenant + attente + ECART;

      const depart = barre.getBoundingClientRect();
      const arrivee = el.getBoundingClientRect();
      const dx = depart.left + depart.width / 2 - (arrivee.left + arrivee.width / 2);
      const dy = depart.top + depart.height / 2 - (arrivee.top + arrivee.height / 2);
      // Une légère vrille, d'un côté puis de l'autre, comme dans un tunnel.
      const vrille = rang % 2 === 0 ? -12 : 12;

      el.classList.add(styles.vu);
      el.style.zIndex = "5";
      vol = el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(0.05) rotate(${vrille}deg)`, opacity: 0 },
          { opacity: 1, offset: 0.12 },
          { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
        ],
        // Départ doux : on a le temps de voir l'image quitter la barre.
        { duration: DUREE, delay: attente, easing: "cubic-bezier(0.5, 0, 0.2, 1)", fill: "backwards" },
      );
      vol.onfinish = () => {
        el.style.zIndex = "";
      };
    };

    const observateur = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) {
          observateur.disconnect();
          partir();
        }
      },
      { rootMargin: "0px 0px -4% 0px" },
    );
    observateur.observe(el);
    return () => {
      observateur.disconnect();
      vol?.cancel();
    };
  }, [rang]);

  return (
    <li ref={ref} className={styles.item}>
      {children}
    </li>
  );
}
