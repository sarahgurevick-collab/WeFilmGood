"use client";

import { useEffect, useState, useTransition } from "react";
import { changerAdhesion } from "./actions";

/**
 * La colonne Adhésion : un menu, appliqué au changement (comme sur WFG 1).
 * Le choix reste affiché pendant l'enregistrement (16/11 : le menu retombait
 * sur « Aucune » alors que l'adhésion était bien posée).
 */
export default function AdhesionMembre({ profileId, plan }: { profileId: string; plan: string | null }) {
  const venu = plan === "mois_7" || plan === "annee_75" ? plan : plan ? "autre" : "";
  const [choix, setChoix] = useState(venu);
  const [, demarrer] = useTransition();

  // Quand la liste est rechargée, on reprend ce que dit le serveur.
  useEffect(() => setChoix(venu), [venu]);

  return (
    <select
      value={choix}
      onChange={(e) => {
        const valeur = e.currentTarget.value;
        if (valeur === "autre") return;
        setChoix(valeur);
        const donnees = new FormData();
        donnees.set("profile_id", profileId);
        donnees.set("plan_slug", valeur);
        demarrer(async () => {
          await changerAdhesion(donnees);
        });
      }}
      style={{ fontSize: 12, padding: "4px 6px" }}
    >
      <option value="">Aucune</option>
      <option value="mois_7">1 mois offert</option>
      <option value="annee_75">75 € par an</option>
      {venu === "autre" && (
        <option value="autre" disabled>
          {plan}
        </option>
      )}
    </select>
  );
}
