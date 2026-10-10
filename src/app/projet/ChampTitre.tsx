"use client";

import Link from "next/link";
import { useState } from "react";
import formStyles from "@/components/form.module.css";
import { ficheSemblable } from "./titres";

/**
 * Le titre d'une nouvelle fiche, avec le garde-fou (10/10, Sarah) : si
 * l'auteur a déjà une fiche au même titre, on le lui dit sous le champ,
 * avec le lien vers elle, et une case à cocher si c'est bien un autre
 * projet. Le serveur refuse la création tant que la case n'est pas cochée.
 */
export default function ChampTitre({ existants }: { existants: { id: string; title: string }[] }) {
  const [titre, setTitre] = useState("");
  const semblable = ficheSemblable(titre, existants);
  return (
    <label className={formStyles.field}>
      <span>Titre *</span>
      <input type="text" name="title" required value={titre} onChange={(e) => setTitre(e.target.value)} />
      {semblable && (
        <span className={formStyles.hint} style={{ color: "#b3261e" }}>
          Vous avez déjà une fiche « {semblable.title} ».{" "}
          <Link href={`/projet/${semblable.id}`}>Voir cette fiche</Link>
          <br />
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6, cursor: "pointer" }}>
            <input type="checkbox" name="autre_projet" value="1" />
            C&apos;est bien un autre projet
          </label>
        </span>
      )}
    </label>
  );
}
