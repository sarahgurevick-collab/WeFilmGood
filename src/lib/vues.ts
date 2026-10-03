import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Parmi ces projets, ceux que le membre connecté a déjà ouverts (03/10) :
 * le repère « déjà ouvert » des cartes. Vide en cas d'erreur — le repère
 * est un confort, jamais une raison de casser une page.
 */
export async function projetsDejaOuverts(supabase: SupabaseClient, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data } = await supabase.from("project_views").select("project_id").in("project_id", ids);
  return new Set((data ?? []).map((v: { project_id: string }) => v.project_id));
}
