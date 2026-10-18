"use client";

import { useState, useTransition } from "react";
import formStyles from "@/components/form.module.css";
import { supprimerMembre } from "./actions";

/**
 * « Supprimer » dans la dernière colonne de l'écran des membres (18/10,
 * Sarah). Deux clics, sans fenêtre du navigateur : « Supprimer », puis
 * « Oui, supprimer ». Le serveur refuse si le membre a des projets, des
 * messages, une adhésion ou des fiches de lecture, et le dit.
 */
export default function SupprimerMembre({ profileId }: { profileId: string }) {
  const [etape, setEtape] = useState<"repos" | "confirmer" | "fait">("repos");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const lien = { cursor: "pointer", background: "none", border: 0, padding: 0, textDecoration: "underline" } as const;

  if (etape === "fait") return <span className={formStyles.hint}>Supprimé</span>;
  if (etape === "repos")
    return (
      <span style={{ display: "block", marginTop: 6 }}>
        <button type="button" className={formStyles.hint} style={lien} onClick={() => setEtape("confirmer")}>
          Supprimer
        </button>
        {erreur && <span className={formStyles.error} style={{ display: "block", fontSize: 12 }}>{erreur}</span>}
      </span>
    );
  return (
    <span style={{ display: "block", marginTop: 6 }}>
      <span className={formStyles.hint}>Supprimer définitivement ?</span>{" "}
      <button
        type="button"
        disabled={enCours}
        style={{ ...lien, color: "#b3261e", fontWeight: 700 }}
        onClick={() =>
          demarrer(async () => {
            const echec = await supprimerMembre(profileId);
            setErreur(echec);
            setEtape(echec ? "repos" : "fait");
          })
        }
      >
        {enCours ? "Suppression…" : "Oui, supprimer"}
      </button>{" "}
      <button type="button" className={formStyles.hint} style={lien} onClick={() => setEtape("repos")}>
        Annuler
      </button>
    </span>
  );
}
