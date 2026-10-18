"use client";

import { useEffect, useRef } from "react";

/**
 * Vérifie le bloc « Qui êtes-vous ? » avant l'envoi (18/10, Sarah : « j'ai
 * eu le message "indiquez au moins une langue parlée" et cela m'a tout
 * effacé »). Le serveur refusait en renvoyant une page neuve : tout ce qui
 * avait été tapé était perdu. Ici, on arrête l'envoi, on écrit le message
 * sous le champ oublié et on y amène l'écran ; rien n'est effacé.
 *
 * Les champs simples (prénom, nom, ville, pays, catégorie) sont déjà
 * vérifiés par le navigateur ; restent les deux que lui ne sait pas
 * vérifier : au moins une langue cochée, et la référence pour un
 * producteur ou un autre talent.
 */
export default function VerifierAvantEnvoi() {
  const ancre = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = ancre.current?.closest("form");
    if (!form) return;

    const message = (nom: string, texte: string | null) => {
      const el = form.querySelector<HTMLElement>(`[data-erreur="${nom}"]`);
      if (!el) return;
      el.textContent = texte ?? "";
      el.hidden = !texte;
    };

    const verifier = (e: SubmitEvent) => {
      let premier: HTMLElement | null = null;

      const langues = form.querySelectorAll<HTMLInputElement>('input[name="languages"]:checked').length;
      message("languages", langues ? null : "Indiquez au moins une langue parlée.");
      if (!langues) premier ??= form.querySelector<HTMLElement>('[data-erreur="languages"]');

      const categorie = form.querySelector<HTMLInputElement>('input[name="category"]:checked')?.value;
      const reference = form.querySelector<HTMLInputElement>('input[name="website"]')?.value.trim();
      const manqueReference = (categorie === "producteur" || categorie === "talent") && !reference;
      message(
        "website",
        manqueReference ? "La référence professionnelle est obligatoire pour un producteur ou un autre talent." : null,
      );
      if (manqueReference) premier ??= form.querySelector<HTMLElement>('input[name="website"]');

      if (premier) {
        e.preventDefault();
        premier.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };

    // Le message s'efface dès qu'on corrige.
    const corriger = (e: Event) => {
      const cible = e.target as HTMLInputElement;
      if (cible.name === "languages") message("languages", null);
      if (cible.name === "website" || cible.name === "category") message("website", null);
    };

    form.addEventListener("submit", verifier);
    form.addEventListener("input", corriger);
    form.addEventListener("change", corriger);
    return () => {
      form.removeEventListener("submit", verifier);
      form.removeEventListener("input", corriger);
      form.removeEventListener("change", corriger);
    };
  }, []);

  return <span ref={ancre} hidden />;
}
