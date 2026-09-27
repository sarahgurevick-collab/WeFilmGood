"use client";

import { changerAdhesion } from "./actions";

/** La colonne Adhésion : un menu, appliqué au changement (comme sur WFG 1). */
export default function AdhesionMembre({ profileId, plan }: { profileId: string; plan: string | null }) {
  const actuel = plan === "palier_50" || plan === "palier_500" ? plan : plan ? "autre" : "";
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
        <option value="palier_50">50 €</option>
        <option value="palier_500">500 €</option>
        {actuel === "autre" && (
          <option value="autre" disabled>
            {plan}
          </option>
        )}
      </select>
    </form>
  );
}
