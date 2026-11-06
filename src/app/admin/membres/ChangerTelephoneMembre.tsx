"use client";

import { useState, useTransition } from "react";
import formStyles from "@/components/form.module.css";
import { changerTelephoneMembre } from "./actions";

/**
 * Le téléphone d'un membre, vu et changé par l'administration sur son
 * profil (06/11, Sarah) : « Modifier » ouvre un champ, « Enregistrer »
 * l'écrit sur-le-champ, comme l'adresse email dans l'écran des membres.
 */
export default function ChangerTelephoneMembre({ profileId, telephone }: { profileId: string; telephone: string | null }) {
  const [ouvert, setOuvert] = useState(false);
  const [actuel, setActuel] = useState(telephone ?? "");
  const [valeur, setValeur] = useState(telephone ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const lien = { cursor: "pointer", textDecoration: "underline", background: "none", border: 0, padding: 0 } as const;

  if (!ouvert) {
    return (
      <span>
        <span className={formStyles.hint}>{actuel ? `Tél. ${actuel}` : "Pas de téléphone"}</span>{" "}
        <button type="button" onClick={() => setOuvert(true)} className={formStyles.hint} style={lien}>
          Modifier
        </button>
      </span>
    );
  }

  const enregistrer = () =>
    demarrer(async () => {
      const echec = await changerTelephoneMembre(profileId, valeur);
      setErreur(echec);
      if (!echec) {
        setActuel(valeur.trim());
        setOuvert(false);
      }
    });

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <input
        type="tel"
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        placeholder="+33 6 12 34 56 78"
        style={{ fontSize: 13, padding: "4px 6px", minWidth: 180 }}
        autoFocus
      />
      <span style={{ display: "flex", gap: 10 }}>
        <button type="button" onClick={enregistrer} disabled={enCours} className={formStyles.hint} style={lien}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOuvert(false);
            setErreur(null);
            setValeur(actuel);
          }}
          className={formStyles.hint}
          style={{ cursor: "pointer", background: "none", border: 0, padding: 0 }}
        >
          Annuler
        </button>
      </span>
      {erreur && <span className={formStyles.error} style={{ fontSize: 12 }}>{erreur}</span>}
    </span>
  );
}
