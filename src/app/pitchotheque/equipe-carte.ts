import type { SupabaseClient } from "@supabase/supabase-js";

/** L'équipe déjà en place, telle que la carte d'un projet la montre (19/10/2026). */
export type EquipeCarte = {
  total: number;
  /** Les métiers, une fois chacun, dans l'ordre de la liste des métiers. */
  metiers: string[];
  /** Les premiers portraits ; floutés par le serveur sans adhésion. */
  portraits: { id: string; src: string | null }[];
};

export const NB_PORTRAITS_EQUIPE = 3;

type Ligne = { project_id: string; profile_id: string; role: string | null; avatar_url: string | null };

/**
 * Pour une liste de projets : les talents déjà rattachés (l'auteur exclu).
 * Sans adhésion, les photos passent par la route qui les floute, comme sur
 * la fiche projet (02/10) ; avec, ou pour l'administration, photo nette.
 */
export async function equipesDesCartes(
  supabase: SupabaseClient,
  ids: string[],
  restreint: boolean,
): Promise<Map<string, EquipeCarte>> {
  const parProjet = new Map<string, EquipeCarte>();
  if (ids.length === 0) return parProjet;
  const { data, error } = await supabase.rpc("equipes_des_projets", { p_ids: ids });
  if (error) return parProjet;
  for (const l of (data ?? []) as Ligne[]) {
    const eq = parProjet.get(l.project_id) ?? { total: 0, metiers: [], portraits: [] };
    eq.total += 1;
    if (l.role && !eq.metiers.includes(l.role)) eq.metiers.push(l.role);
    if (eq.portraits.length < NB_PORTRAITS_EQUIPE) {
      eq.portraits.push({
        id: l.profile_id,
        src: l.avatar_url ? (restreint ? `/api/talents/photo?id=${l.profile_id}` : l.avatar_url) : null,
      });
    }
    parProjet.set(l.project_id, eq);
  }
  return parProjet;
}

/** Sans adhésion (et hors administration), les photos des autres sont floutées. */
export async function lectureRestreinte(supabase: SupabaseClient, userId: string | null | undefined): Promise<boolean> {
  if (!userId) return true;
  const [{ data: admin }, { data: adherent }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.rpc("a_une_adhesion_active", { p_profile_id: userId }),
  ]);
  return admin !== true && adherent !== true;
}
