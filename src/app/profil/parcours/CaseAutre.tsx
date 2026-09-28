"use client";

import { useState } from "react";
import formStyles from "@/components/form.module.css";

/**
 * La pastille « Un autre métier… » / « Un autre genre… » : cochée, elle
 * ouvre un champ libre. Ce champ reste facultatif — cocher suffit pour
 * dire « rien de la liste ne me correspond ».
 */
export default function CaseAutre({
  libelle,
  nomCase,
  nomTexte,
  actif,
  texte,
}: {
  libelle: string;
  nomCase: string;
  nomTexte: string;
  actif: boolean;
  texte: string;
}) {
  const [coche, setCoche] = useState(actif);
  return (
    <>
      <label className={formStyles.role}>
        <input
          type="checkbox"
          name={nomCase}
          value="1"
          checked={coche}
          onChange={(e) => setCoche(e.target.checked)}
        />
        {libelle}
      </label>
      {coche && (
        <input
          type="text"
          name={nomTexte}
          defaultValue={texte}
          placeholder="Précisez si vous le souhaitez"
          style={{ flexBasis: "100%" }}
        />
      )}
    </>
  );
}
