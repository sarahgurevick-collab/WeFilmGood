"use client";

import { useEffect, useState, useTransition } from "react";
import { changerDisponibiliteLecteur } from "./actions";

/**
 * La disponibilité d'un lecteur, avec les mots de WFG 1 (16/11, Sarah) :
 * « Libre » (interrupteur OUI) ou « Repos » (interrupteur NON). Quand une
 * lecture est en cours, « Travail assigné », sans interrupteur : c'est la
 * plateforme qui le pose et le retire.
 */
export default function DisponibiliteLecteur({ profileId, statut }: { profileId: string; statut: string }) {
  const [valeur, setValeur] = useState(statut);
  const [, demarrer] = useTransition();
  useEffect(() => setValeur(statut), [statut]);

  if (valeur === "orange") return <span title="Une lecture est en cours">Travail assigné</span>;

  const on = valeur !== "rouge";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
      <span>{on ? "Libre" : "Repos"}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Libre"
        title={on ? "Libre : cliquer pour passer en repos" : "Repos : cliquer pour passer en libre"}
        onClick={() => {
          const suivant = on ? "rouge" : "vert";
          setValeur(suivant);
          demarrer(async () => {
            await changerDisponibiliteLecteur(profileId, suivant);
          });
        }}
        style={{
          fontSize: 12,
          fontWeight: 800,
          minWidth: 64,
          padding: "4px 14px",
          borderRadius: 999,
          cursor: "pointer",
          border: "2px solid #111",
          background: on ? "#DA2C25" : "#fff",
          color: on ? "#fff" : "#111",
          textAlign: on ? "left" : "right",
        }}
      >
        {on ? "OUI" : "NON"}
      </button>
    </div>
  );
}
