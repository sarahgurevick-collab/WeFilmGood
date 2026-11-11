import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Qui lit les fiches et voit les titres (12/11/2026, décision de Sarah).
 *
 * Sans adhésion, on ne voit des projets que leur carte : image, tagline,
 * mots-clés — ni la fiche, ni le titre (« avec le titre et le résumé on
 * retrouve l'auteur ailleurs » ; sur WFG 1 le titre n'était pas affiché non
 * plus). Chercher un titre que l'on connaît trouve quand même le projet,
 * comme pour les talents. Exceptions : ses propres projets, ceux de son
 * équipe, ceux que l'on a ouverts avec un Gravity ; l'administration et les
 * adhérents lisent tout.
 */
export type AccesFiches = {
  /** Adhérent ou administration : toutes les fiches, tous les titres. */
  complet: boolean;
  /** Le titre de ce projet peut-il partir vers le navigateur ? */
  voitLeTitre: (projetId: string) => boolean;
};

export async function accesAuxFiches(supabase: SupabaseClient, userId: string | null | undefined): Promise<AccesFiches> {
  if (!userId) return { complet: false, voitLeTitre: () => false };
  const [{ data: admin }, { data: adherent }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("a_une_adhesion_active", { p_profile_id: userId }),
  ]);
  if (admin === true || adherent === true) return { complet: true, voitLeTitre: () => true };
  const [{ data: miens }, { data: ouverts }, { data: equipes }] = await Promise.all([
    supabase.from("projects").select("id").eq("owner_id", userId),
    supabase.from("gravity_ouvertures").select("project_id").eq("profile_id", userId),
    supabase.from("project_co_authors").select("project_id").eq("profile_id", userId).eq("status", "accepte"),
  ]);
  const ids = new Set<string>([
    ...((miens ?? []) as { id: string }[]).map((p) => p.id),
    ...((ouverts ?? []) as { project_id: string }[]).map((o) => o.project_id),
    ...((equipes ?? []) as { project_id: string }[]).map((e) => e.project_id),
  ]);
  return { complet: false, voitLeTitre: (projetId) => ids.has(projetId) };
}

/** L'âge et le sexe d'un personnage, en clair (« Femme · Adulte »). */
const LISIBLE: Record<string, string> = {
  homme: "Homme",
  femme: "Femme",
  autre: "Autre",
  enfant: "Enfant",
  adolescent: "Adolescent",
  adulte: "Adulte",
  senior: "Senior",
};
export function sexeEtAge(gender: string | null | undefined, ageRange: string | null | undefined): string {
  return [LISIBLE[gender ?? ""], LISIBLE[ageRange ?? ""]].filter(Boolean).join(" · ");
}
