"use client";

import { useState, useTransition } from "react";
import formStyles from "@/components/form.module.css";
import { changerAdresseMembre } from "./actions";

/**
 * L'adresse d'un membre dans l'écran des membres : « Modifier » ouvre un
 * champ, « Enregistrer » change l'adresse sur-le-champ, sans confirmation
 * (09/10, Sarah). La liste se rafraîchit toute seule.
 */
export default function ChangerAdresseMembre({ profileId, email }: { profileId: string; email: string | null }) {
  const [ouvert, setOuvert] = useState(false);
  const [valeur, setValeur] = useState(email ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  if (!ouvert) {
    return (
      <>
        <span className={formStyles.hint}>{email}</span>{" "}
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className={formStyles.hint}
          style={{ cursor: "pointer", textDecoration: "underline", background: "none", border: 0, padding: 0 }}
        >
          Modifier
        </button>
      </>
    );
  }

  const enregistrer = () =>
    demarrer(async () => {
      const echec = await changerAdresseMembre(profileId, valeur);
      setErreur(echec);
      if (!echec) setOuvert(false);
    });

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <input
        type="email"
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        style={{ fontSize: 13, padding: "4px 6px", minWidth: 220 }}
        autoFocus
      />
      <span style={{ display: "flex", gap: 10 }}>
        <button type="button" onClick={enregistrer} disabled={enCours} className={formStyles.hint} style={{ cursor: "pointer", textDecoration: "underline", background: "none", border: 0, padding: 0 }}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" onClick={() => { setOuvert(false); setErreur(null); setValeur(email ?? ""); }} className={formStyles.hint} style={{ cursor: "pointer", background: "none", border: 0, padding: 0 }}>
          Annuler
        </button>
      </span>
      {erreur && <span className={formStyles.error} style={{ fontSize: 12 }}>{erreur}</span>}
    </span>
  );
}
