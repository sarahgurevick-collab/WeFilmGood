/**
 * Prénom et nom proposés dans les formulaires « Qui êtes-vous ? » quand le
 * profil n'a que son nom complet (comptes invités créés avec « Didier
 * PHILIPPE » seulement) : le premier mot est le prénom, le reste le nom.
 * Ce n'est qu'une proposition, la personne la corrige si besoin (20/11/2026 :
 * Didier Philippe avait retapé « Philippe » dans les deux cases).
 */
export function prenomEtNomProposes(profil: {
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
} | null): { prenom: string; nom: string } {
  const prenom = profil?.first_name?.trim() ?? "";
  const nom = profil?.last_name?.trim() ?? "";
  if (prenom || nom) return { prenom, nom };
  const mots = (profil?.full_name ?? "").trim().split(/\s+/).filter(Boolean);
  if (mots.length < 2) return { prenom: "", nom: "" };
  return { prenom: mots[0], nom: mots.slice(1).join(" ") };
}
