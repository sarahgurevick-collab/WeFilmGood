"use client";

import { useActionState, type ReactNode } from "react";
import adminStyles from "../admin.module.css";
import { attribuerLecteur, type EtatAttribution } from "./actions";

/**
 * Le menu des lecteurs et le bouton « Assigner », avec un retour sur la
 * ligne (17/11) : « Proposé à … », et le bouton se grise pendant l'envoi
 * pour qu'un second clic ne parte pas.
 */
export default function FormulaireAttribuer({ projectId, children }: { projectId: string; children: ReactNode }) {
  const [etat, action, enCours] = useActionState<EtatAttribution, FormData>(attribuerLecteur, null);

  return (
    <form action={action} className={adminStyles.attribuer}>
      <input type="hidden" name="project_id" value={projectId} />
      <select name="reader_id" defaultValue="" required>
        {children}
      </select>
      <button type="submit" className={adminStyles.boutonAssigner} disabled={enCours}>
        {enCours ? "…" : "Assigner"}
      </button>
      {etat && (
        <span role="status" style={{ fontSize: 12, color: etat.erreur ? "#e2231a" : "#3c9a4a", width: "100%" }}>
          {etat.message}
        </span>
      )}
    </form>
  );
}
