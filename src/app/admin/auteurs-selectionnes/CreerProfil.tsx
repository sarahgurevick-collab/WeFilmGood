"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import formStyles from "@/components/form.module.css";
import { creerProfilAuteur } from "./actions";

/** Une ligne : prénom, nom (préremplis, à corriger), adresse, téléphone. */
export default function CreerProfil({ prenom, nom }: { prenom: string; nom: string }) {
  const [champs, setChamps] = useState({ prenom, nom, email: "", telephone: "" });
  const [cree, setCree] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  if (cree) {
    return (
      <Link href={`/membres/${cree}`} className={formStyles.hint} style={{ textDecoration: "underline" }}>
        Profil créé
      </Link>
    );
  }

  const champ = (cle: keyof typeof champs, libelle: string, type = "text", requis = false) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12 }}>
      {libelle}
      <input
        type={type}
        value={champs[cle]}
        required={requis}
        onChange={(e) => setChamps({ ...champs, [cle]: e.target.value })}
        style={{ fontSize: 13, padding: "4px 6px", minWidth: 150 }}
      />
    </label>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        demarrer(async () => {
          const r = await creerProfilAuteur(champs);
          if ("id" in r) setCree(r.id);
          else setErreur(r.erreur);
        });
      }}
      style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 8 }}
    >
      {champ("prenom", "Prénom", "text", true)}
      {champ("nom", "Nom")}
      {champ("email", "Adresse email (facultatif)", "email")}
      {champ("telephone", "Téléphone (facultatif)", "tel")}
      <button type="submit" disabled={enCours} className={formStyles.submit} style={{ padding: "6px 12px", fontSize: 13, alignSelf: "flex-end" }}>
        Créer le profil
      </button>
      {erreur && <span className={formStyles.error} style={{ fontSize: 12, width: "100%" }}>{erreur}</span>}
    </form>
  );
}
