"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Posé par les barres du haut, pour les membres connectés. */
export const EMPLACEMENT_ENTETE = "data-outils-entete";

/**
 * Où ranger Mira et le globe de traduction : dans la barre du haut, à côté
 * du Menu, quand la page en a une et qu'elle est visible (la barre noire
 * descend sous le pouce sur téléphone et n'a pas de place pour eux).
 *
 * `undefined` tant qu'on n'a pas regardé (rien ne s'affiche, pour ne pas voir
 * le rond sauter du coin de l'écran vers la barre), `null` si la page n'a
 * pas d'emplacement : le rond reste alors en bas à droite.
 */
export function useEmplacementEntete(): HTMLElement | null | undefined {
  const chemin = usePathname();
  const [emplacement, setEmplacement] = useState<HTMLElement | null | undefined>(undefined);

  useEffect(() => {
    const chercher = () => {
      const trouve = Array.from(
        document.querySelectorAll<HTMLElement>(`[${EMPLACEMENT_ENTETE}]`),
      ).find((el) => el.getClientRects().length > 0);
      setEmplacement(trouve ?? null);
    };
    chercher();
    window.addEventListener("resize", chercher);
    return () => window.removeEventListener("resize", chercher);
  }, [chemin]);

  return emplacement;
}

/**
 * Vrai pendant le défilement et une demi-seconde après : les ronds rangés
 * en haut de l'écran se retirent pour ne pas gêner la lecture, comme la
 * bande blanche.
 */
export function useCacheAuDefilement(): boolean {
  const [cache, setCache] = useState(false);

  useEffect(() => {
    let minuteur: ReturnType<typeof setTimeout> | undefined;
    const surDefilement = () => {
      setCache(true);
      clearTimeout(minuteur);
      minuteur = setTimeout(() => setCache(false), 500);
    };
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => {
      window.removeEventListener("scroll", surDefilement);
      clearTimeout(minuteur);
    };
  }, []);

  return cache;
}
