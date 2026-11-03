"use client";

import { useState } from "react";
import formStyles from "@/components/form.module.css";
import { enregistrerLesModifies, recharger } from "./enregistrement";

/**
 * Le bouton sous le portrait. Il enregistre tous les cadres modifiés, pas
 * seulement le sien (03/11, Sarah) : la page se recharge après, et les
 * changements des autres cadres étaient perdus. Il dit « Enregistrement… »
 * pendant l'envoi (06/10, Sarah : « il ne se passe rien »).
 */
export default function BoutonEnregistrer({ libelle, projectId }: { libelle: string; projectId: string }) {
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        className={formStyles.submit}
        disabled={envoi}
        onClick={async (e) => {
          const form = e.currentTarget.closest("form");
          if (!form) return;
          // Un nouveau personnage sans nom : le navigateur le signale ici.
          if (!form.reportValidity()) return;
          setErreur(null);
          setEnvoi(true);
          const echec = await enregistrerLesModifies();
          if (echec) {
            setErreur(echec);
            setEnvoi(false);
            return;
          }
          recharger(projectId, form.id || undefined);
        }}
      >
        {envoi ? "Enregistrement…" : libelle}
      </button>
      {erreur && <p className={formStyles.error}>{erreur}</p>}
    </>
  );
}
