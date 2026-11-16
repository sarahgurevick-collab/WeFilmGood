"use client";

import { useEffect, useState, useTransition } from "react";
import { changerDisponibiliteLecteur } from "./actions";

/**
 * La disponibilité d'un lecteur, en ON / OFF comme sur WFG 1 (16/11, Sarah).
 * ON = disponible (vert), OFF = indisponible (rouge). L'orange, « en cours
 * de lecture », est posé par la plateforme : pas d'interrupteur tant qu'il dure.
 */
export default function DisponibiliteLecteur({ profileId, statut }: { profileId: string; statut: string }) {
  const [valeur, setValeur] = useState(statut);
  const [, demarrer] = useTransition();
  useEffect(() => setValeur(statut), [statut]);

  if (valeur === "orange") return <span title="Une lecture est en cours">En lecture</span>;

  const on = valeur !== "rouge";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      title={on ? "Disponible : cliquer pour passer à OFF" : "Indisponible : cliquer pour passer à ON"}
      onClick={() => {
        const suivant = on ? "rouge" : "vert";
        setValeur(suivant);
        demarrer(async () => {
          await changerDisponibiliteLecteur(profileId, suivant);
        });
      }}
      style={{
        fontSize: 12,
        fontWeight: 700,
        padding: "4px 14px",
        borderRadius: 999,
        cursor: "pointer",
        border: `1px solid ${on ? "#2f7d4f" : "#d14b43"}`,
        background: on ? "#2f7d4f" : "transparent",
        color: on ? "#fff" : "#d14b43",
      }}
    >
      {on ? "ON" : "OFF"}
    </button>
  );
}
