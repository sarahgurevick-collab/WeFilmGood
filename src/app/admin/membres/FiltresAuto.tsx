"use client";

import { useRef, type ReactNode } from "react";

/**
 * Le formulaire des filtres de la page Membres, appliqué tout seul
 * (27/09) : un menu changé filtre aussitôt ; la recherche par nom ou email
 * part une demi-seconde après la dernière lettre tapée. Plus de bouton
 * « Filtrer ».
 */
export default function FiltresAuto({ className, children }: { className: string; children: ReactNode }) {
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (
    <form
      method="get"
      className={className}
      onChange={(e) => {
        const cible = e.target as HTMLElement;
        const form = e.currentTarget;
        if (minuteur.current) clearTimeout(minuteur.current);
        if (cible instanceof HTMLInputElement && cible.type === "search") {
          minuteur.current = setTimeout(() => form.requestSubmit(), 500);
        } else {
          form.requestSubmit();
        }
      }}
      onInput={(e) => {
        const cible = e.target as HTMLElement;
        if (!(cible instanceof HTMLInputElement && cible.type === "search")) return;
        const form = e.currentTarget;
        if (minuteur.current) clearTimeout(minuteur.current);
        minuteur.current = setTimeout(() => form.requestSubmit(), 500);
      }}
    >
      {children}
    </form>
  );
}
