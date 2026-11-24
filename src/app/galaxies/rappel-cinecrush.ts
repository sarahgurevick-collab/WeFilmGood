import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Le rappel du CinéCrush sur les Galaxies (24/11/2026, Sarah). La fenêtre
 * de la veille cachait l'animation des cartes qui sortent du Finder : elle
 * est retirée (retour : étiquette galaxies-avant-cinecrush-dans-animation).
 * À la place, le projet de la semaine sort du Finder avec les autres — au
 * milieu des trois colonnes, le premier sur téléphone — et son image
 * respire, le code du site pour « il y a quelque chose à faire ici ».
 *
 * Rend le projet à rappeler, ou null : rien si aucune semaine n'est
 * programmée, ou si le talent a déjà ouvert la page CinéCrush cette
 * semaine-là (table cinecrush_visites, migration 0326).
 */
export async function crushARappeler(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: dimanche } = await supabase.rpc("dimanche_de_la_semaine");
  if (!dimanche) return null;
  const [{ data: crush }, { data: visite }] = await Promise.all([
    supabase.from("cinecrush").select("project_id").eq("semaine", dimanche as string).maybeSingle<{ project_id: string | null }>(),
    supabase.from("cinecrush_visites").select("semaine").eq("profile_id", userId).eq("semaine", dimanche as string).maybeSingle(),
  ]);
  if (!crush?.project_id || visite) return null;
  return crush.project_id;
}
