"use client";

import { useState, useTransition } from "react";
import formStyles from "@/components/form.module.css";
import { deverrouillerCineMatch } from "./actions";

/**
 * « Déverrouiller CinéMatch » (20/10/2026) : les réponses données sont
 * verrouillées pour le jeu ; ce bouton permet au membre de les corriger une
 * fois, à sa prochaine sauvegarde.
 */
export default function DeverrouillerCineMatch({ profileId }: { profileId: string }) {
  const [fait, setFait] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const lien = { cursor: "pointer", background: "none", border: 0, padding: 0, textDecoration: "underline" } as const;

  if (fait) return <span className={formStyles.hint} style={{ display: "block", marginTop: 6 }}>CinéMatch déverrouillé</span>;
  return (
    <span style={{ display: "block", marginTop: 6 }}>
      <button
        type="button"
        className={formStyles.hint}
        style={lien}
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            const echec = await deverrouillerCineMatch(profileId);
            setErreur(echec);
            setFait(!echec);
          })
        }
      >
        {enCours ? "Déverrouillage…" : "Déverrouiller CinéMatch"}
      </button>
      {erreur && <span className={formStyles.error} style={{ display: "block", fontSize: 12 }}>{erreur}</span>}
    </span>
  );
}
