"use client";

import { useActionState, useState } from "react";
import { enregistrerMemo, type EtatAttribution } from "./actions";

/**
 * Le mémo de l'administration sur la ligne du projet (17/11). Quand il y en
 * a un, il se lit sans cliquer, en couleur ; un clic sur « Modifier » ouvre
 * la zone de texte. Un texte vidé efface le mémo.
 */
export default function MemoProjet({ projectId, memo }: { projectId: string; memo: string | null }) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState<EtatAttribution, FormData>(async (e, f) => {
    const r = await enregistrerMemo(e, f);
    if (!r?.erreur) setOuvert(false);
    return r;
  }, null);

  return (
    <div style={{ marginTop: 6 }}>
      {memo && !ouvert && (
        <p
          style={{
            margin: "0 0 4px",
            padding: "4px 8px",
            background: "#fff4c2",
            borderLeft: "3px solid #e0a800",
            fontSize: 12,
            whiteSpace: "pre-wrap",
          }}
        >
          {memo}
        </p>
      )}
      {ouvert ? (
        <form action={action}>
          <input type="hidden" name="project_id" value={projectId} />
          <textarea
            name="memo"
            defaultValue={memo ?? ""}
            rows={3}
            maxLength={1000}
            autoFocus
            style={{ width: "100%", fontSize: 12 }}
          />
          <button type="submit" disabled={enCours} style={{ fontSize: 12 }}>
            {enCours ? "…" : "Enregistrer"}
          </button>{" "}
          <button type="button" onClick={() => setOuvert(false)} style={{ fontSize: 12 }}>
            Annuler
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOuvert(true)}
          style={{ background: "none", border: "none", padding: 0, fontSize: 12, color: "#666", textDecoration: "underline", cursor: "pointer" }}
        >
          {memo ? "Modifier le mémo" : "+ Mémo"}
        </button>
      )}
      {etat?.erreur && (
        <span role="status" style={{ fontSize: 12, color: "#e2231a", display: "block" }}>
          {etat.message}
        </span>
      )}
    </div>
  );
}
