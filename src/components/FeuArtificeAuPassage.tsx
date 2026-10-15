"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import FeuArtifice from "./FeuArtifice";

/**
 * Fait éclater le feu d'artifice de l'ancien écran d'accueil (celui qui
 * saluait le compteur « 10 ans ») une seule fois, quand le contenu arrive
 * à l'écran (15/10/2026, Sarah : le titre « WeFilmGood a 10 ans ! »).
 * Le cadre est en position relative : les gerbes partent de son centre.
 */
export default function FeuArtificeAuPassage({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const cadre = useRef<HTMLDivElement>(null);
  const [lance, setLance] = useState(false);

  useEffect(() => {
    const el = cadre.current;
    if (!el || lance) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observateur = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          setLance(true);
          observateur.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    observateur.observe(el);
    return () => observateur.disconnect();
  }, [lance]);

  return (
    <div ref={cadre} className={className} style={{ position: "relative" }}>
      {lance && <FeuArtifice />}
      {children}
    </div>
  );
}
