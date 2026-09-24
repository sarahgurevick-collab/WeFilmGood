"use client";

import { type RefObject, useEffect, useState } from "react";
import { engagementAffiche } from "./engagements";

/**
 * L'engagement à l'écran pour l'élément donné, relu sur l'animation CSS
 * « engagements » plusieurs fois par seconde. La couleur, elle, vient
 * directement de var(--engagement) : ce crochet ne sert qu'à la mention
 * (« for Planet »…). 0 (le rouge, sans mention) si rien n'est animé.
 */
export function useEngagement(ref: RefObject<Element | null>): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const lire = () => {
      if (ref.current) setIndex(engagementAffiche(ref.current) ?? 0);
    };
    lire();
    const minuteur = setInterval(lire, 150);
    return () => clearInterval(minuteur);
  }, [ref]);

  return index;
}
