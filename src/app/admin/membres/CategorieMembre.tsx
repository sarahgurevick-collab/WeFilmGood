"use client";

import { changerCategorie } from "./actions";

/**
 * La colonne Métier : la catégorie du membre, changée d'un menu (10/10,
 * Sarah). Sur WFG 1, une réalisatrice inscrite en producteur devait tout
 * refaire ; ici on change la catégorie, le reste du profil reste. La
 * validation suit la catégorie, comme quand le membre la choisit lui-même.
 */
export default function CategorieMembre({ profileId, category }: { profileId: string; category: string | null }) {
  return (
    <form action={changerCategorie}>
      <input type="hidden" name="profile_id" value={profileId} />
      <select
        name="category"
        defaultValue={category ?? ""}
        onChange={(e) => {
          if (!e.currentTarget.value) return;
          e.currentTarget.form?.requestSubmit();
        }}
        style={{ fontSize: 12, padding: "4px 6px" }}
      >
        {!category && (
          <option value="" disabled>
            —
          </option>
        )}
        <option value="auteur">Auteur</option>
        <option value="producteur">Producteur</option>
        <option value="talent">Autre talent</option>
        <option value="cinephile">Greenlighter</option>
      </select>
    </form>
  );
}
