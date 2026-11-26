"use client";

import { useState, useTransition } from "react";
import formStyles from "@/components/form.module.css";
import { trancherNomProche } from "./actions";

/** Les deux boutons d'une ligne : même personne, ou non. */
export default function Trancher({ cle, nom, profileId }: { cle: string; nom: string; profileId: string }) {
  const [fait, setFait] = useState<"meme" | "autre" | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const trancher = (decision: "meme" | "autre") =>
    demarrer(async () => {
      const r = await trancherNomProche(cle, nom, profileId, decision);
      if ("ok" in r) {
        setFait(decision);
        setErreur(null);
      } else setErreur(r.erreur);
    });

  if (fait) return <span className={formStyles.hint}>{fait === "meme" ? "Même personne" : "Pas la même personne"}</span>;
  return (
    <span style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      <button type="button" disabled={enCours} onClick={() => trancher("meme")} className={formStyles.submit} style={{ padding: "4px 10px", fontSize: 12 }}>
        Même personne
      </button>
      <button
        type="button"
        disabled={enCours}
        onClick={() => trancher("autre")}
        style={{ padding: "4px 10px", fontSize: 12, background: "none", border: "1px solid currentColor", borderRadius: 6, cursor: "pointer" }}
      >
        Pas la même
      </button>
      {erreur && <span className={formStyles.error} style={{ fontSize: 12 }}>{erreur}</span>}
    </span>
  );
}
