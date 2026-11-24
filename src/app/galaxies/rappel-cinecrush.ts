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
 *
 * L'administration le voit toujours, même la page déjà ouverte (24/11,
 * Sarah) : elle doit pouvoir regarder la carte telle que la voit un talent.
 */
export async function crushARappeler(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: dimanche } = await supabase.rpc("dimanche_de_la_semaine");
  if (!dimanche) return null;
  const [{ data: crush }, { data: visite }, { data: admin }] = await Promise.all([
    supabase.from("cinecrush").select("project_id").eq("semaine", dimanche as string).maybeSingle<{ project_id: string | null }>(),
    supabase.from("cinecrush_visites").select("semaine").eq("profile_id", userId).eq("semaine", dimanche as string).maybeSingle(),
    supabase.rpc("is_admin"),
  ]);
  if (!crush?.project_id) return null;
  if (visite && admin !== true) return null;
  return crush.project_id;
}
