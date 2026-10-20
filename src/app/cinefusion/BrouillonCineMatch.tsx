"use client";

import { useEffect, useRef } from "react";

const CLE = "cinematch-brouillon";

/**
 * Garde les réponses d'un visiteur dans son navigateur au fil de l'eau, et
 * les remet si la page est rechargée ou refermée par erreur. Rien ne part
 * sur le serveur : c'est seulement un brouillon local.
 */
export default function BrouillonCineMatch() {
  const repere = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const formulaire = repere.current?.closest("form");
    if (!formulaire) return;

    try {
      const brouillon = JSON.parse(localStorage.getItem(CLE) ?? "{}") as Record<string, string>;
      for (const [nom, valeur] of Object.entries(brouillon)) {
        const champ = formulaire.elements.namedItem(nom);
        if (champ instanceof HTMLSelectElement || champ instanceof HTMLInputElement) {
          champ.value = valeur;
        }
      }
    } catch {
      // Navigateur sans stockage : le formulaire marche, sans brouillon.
    }

    const enregistrer = () => {
      try {
        const valeurs: Record<string, string> = {};
        for (const [nom, valeur] of new FormData(formulaire)) {
          if (nom.startsWith("q_") && typeof valeur === "string" && valeur) valeurs[nom] = valeur;
        }
        localStorage.setItem(CLE, JSON.stringify(valeurs));
      } catch {
        // idem
      }
    };
    formulaire.addEventListener("input", enregistrer);
    formulaire.addEventListener("change", enregistrer);
    return () => {
      formulaire.removeEventListener("input", enregistrer);
      formulaire.removeEventListener("change", enregistrer);
    };
  }, []);

  return <span ref={repere} hidden />;
}
