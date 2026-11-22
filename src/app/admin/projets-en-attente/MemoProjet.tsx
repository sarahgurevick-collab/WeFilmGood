"use client";

import { useActionState, useState } from "react";
import { enregistrerMemo, type EtatAttribution } from "./actions";

/**
 * Le mémo de l'administration sur la ligne du projet (17/11). Quand il y en
 * a un, il se lit sans cliquer, en couleur ; un clic sur « Modifier » ouvre
 * la zone de texte. Un texte vidé efface le mémo.
 */
export default function MemoProjet({ projectId, memo, titre }: { projectId: string; memo: string | null; titre: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState<EtatAttribution, FormData>(async (e, f) => {
    const r = await enregistrerMemo(e, f);
    if (!r?.erreur) setOuvert(false);
    return r;
  }, null);

  return (
    <div>
      <div>
        {/* Le titre mène à la fiche du projet (22/11) : moodboard, personnages… */}
        <a href={`/projet/${projectId}`} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
          {titre}
        </a>{" "}
        {!ouvert && (
          <button
            type="button"
            onClick={() => setOuvert(true)}
            title={memo ? "Modifier le mémo" : "Ajouter un mémo"}
            aria-label={memo ? "Modifier le mémo" : "Ajouter un mémo"}
            style={{ background: "none", border: "none", padding: "0 4px", fontSize: 14, color: memo ? "#e0a800" : "#666", cursor: "pointer" }}
          >
            ✕
          </button>
        )}
      </div>
      {memo && !ouvert && (
        <p
          style={{
            margin: "0 0 4px",
            padding: "4px 8px",
            background: "#fff4c2",
            color: "#000",
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
            style={{ width: "100%", fontSize: 12, color: "#000", background: "#fff" }}
          />
          <button type="submit" disabled={enCours} style={{ fontSize: 12 }}>
            {enCours ? "…" : "Enregistrer"}
          </button>{" "}
          <button type="button" onClick={() => setOuvert(false)} style={{ fontSize: 12 }}>
            Annuler
          </button>
        </form>
      ) : null}
      {etat?.erreur && (
        <span role="status" style={{ fontSize: 12, color: "#e2231a", display: "block" }}>
          {etat.message}
        </span>
      )}
    </div>
  );
}
