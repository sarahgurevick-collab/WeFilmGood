"use client";

import { useEffect, useRef, useState } from "react";
import formStyles from "@/components/form.module.css";
import { MIN_REPONSES } from "@/lib/cinematch-constantes";

/**
 * Le bouton du questionnaire CinéMatch (21/10/2026, Sarah) : « Enregistrer »
 * tant qu'il y a moins de 12 réponses — sinon on croit qu'on peut terminer à
 * 5 questions —, « Enregistrer et terminer » à partir de 12. Il compte au fil
 * de la saisie, réponses déjà verrouillées (champs grisés) comprises.
 */
export default function BoutonEnregistrer({ reponsesInitiales }: { reponsesInitiales: number }) {
  const bouton = useRef<HTMLButtonElement>(null);
  const [nombre, setNombre] = useState(reponsesInitiales);

  useEffect(() => {
    const formulaire = bouton.current?.closest("form");
    if (!formulaire) return;

    const compter = () => {
      const repondues = new Set<string>();
      for (const champ of Array.from(formulaire.elements)) {
        if (!(champ instanceof HTMLSelectElement || champ instanceof HTMLInputElement)) continue;
        const m = /^q_(.+?)(_autre)?$/.exec(champ.name);
        if (m && champ.value.trim()) repondues.add(m[1]);
      }
      setNombre(repondues.size);
    };

    compter();
    formulaire.addEventListener("input", compter);
    formulaire.addEventListener("change", compter);
    return () => {
      formulaire.removeEventListener("input", compter);
      formulaire.removeEventListener("change", compter);
    };
  }, []);

  return (
    <button ref={bouton} type="submit" className={formStyles.submit}>
      {nombre >= MIN_REPONSES ? "Enregistrer et terminer →" : "Enregistrer"}
    </button>
  );
}
