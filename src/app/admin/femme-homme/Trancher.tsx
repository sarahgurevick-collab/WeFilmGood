"use client";

import { useState, useTransition } from "react";
import formStyles from "@/components/form.module.css";
import { trancherFemmeHomme } from "./actions";

type Choix = "femme" | "homme" | null;

const bouton = (actif: boolean) => ({
  padding: "4px 10px",
  fontSize: 12,
  borderRadius: 6,
  cursor: "pointer",
  border: "1px solid currentColor",
  background: actif ? "#DA2C25" : "none",
  color: actif ? "#fff" : "inherit",
  fontWeight: actif ? 600 : 400,
});

/** Les trois boutons d'une ligne ; le choix en cours est en rouge. */
export default function Trancher({ profileId, actuel }: { profileId: string; actuel: Choix | "vide" }) {
  const [choix, setChoix] = useState<Choix | "vide">(actuel);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const trancher = (v: Choix) =>
    demarrer(async () => {
      const r = await trancherFemmeHomme(profileId, v);
      if ("ok" in r) {
        setChoix(v);
        setErreur(null);
      } else setErreur(r.erreur);
    });

  return (
    <span style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      <button type="button" disabled={enCours} onClick={() => trancher("femme")} style={bouton(choix === "femme")}>
        Femme
      </button>
      <button type="button" disabled={enCours} onClick={() => trancher("homme")} style={bouton(choix === "homme")}>
        Homme
      </button>
      <button type="button" disabled={enCours} onClick={() => trancher(null)} style={bouton(choix === null)}>
        On laisse de côté
      </button>
      {erreur && <span className={formStyles.error} style={{ fontSize: 12 }}>{erreur}</span>}
    </span>
  );
}
