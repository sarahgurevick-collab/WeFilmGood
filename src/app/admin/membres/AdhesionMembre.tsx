"use client";

import { changerAdhesion } from "./actions";

/** La colonne Adhésion : un menu, appliqué au changement (comme sur WFG 1). */
export default function AdhesionMembre({ profileId, plan }: { profileId: string; plan: string | null }) {
  const actuel = plan === "mois_7" || plan === "annee_75" ? plan : plan ? "autre" : "";
  return (
    <form action={changerAdhesion}>
      <input type="hidden" name="profile_id" value={profileId} />
      <select
        name="plan_slug"
        defaultValue={actuel}
        onChange={(e) => {
          if (e.currentTarget.value === "autre") return;
          e.currentTarget.form?.requestSubmit();
        }}
        style={{ fontSize: 12, padding: "4px 6px" }}
      >
        <option value="">Aucune</option>
        <option value="mois_7">1 mois offert</option>
        <option value="annee_75">75 € par an</option>
        {actuel === "autre" && (
          <option value="autre" disabled>
            {plan}
          </option>
        )}
      </select>
    </form>
  );
}
