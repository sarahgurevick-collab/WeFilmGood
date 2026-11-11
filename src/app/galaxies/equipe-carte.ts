import type { SupabaseClient } from "@supabase/supabase-js";
import { lettreDuMetier } from "@/lib/lettre-metier";
import { photoNette } from "@/lib/photo";

/** L'équipe déjà en place, telle que la carte d'un projet la montre (19/10/2026). */
export type EquipeCarte = {
  total: number;
  /** Les métiers, une fois chacun, dans l'ordre de la liste des métiers. */
  metiers: string[];
  /** Les premiers ronds : la photo (floutée par le serveur sans adhésion), ou la lettre du métier sur fond rouge. */
  portraits: { id: string; src: string | null; lettre: string }[];
};

export const NB_PORTRAITS_EQUIPE = 3;

type Ligne = { project_id: string; profile_id: string | null; role: string | null; avatar_url: string | null };

/**
 * Pour une liste de projets : les talents déjà rattachés (l'auteur exclu).
 * Sans adhésion, les photos passent par la route qui les floute, comme sur
 * la fiche projet (02/10) ; avec, ou pour l'administration, photo nette.
 */
export async function equipesDesCartes(
  supabase: SupabaseClient,
  ids: string[],
  restreint: boolean | ((projetId: string) => boolean),
): Promise<Map<string, EquipeCarte>> {
  const flou = (projetId: string) => (typeof restreint === "function" ? restreint(projetId) : restreint);
  const parProjet = new Map<string, EquipeCarte>();
  if (ids.length === 0) return parProjet;
  const { data, error } = await supabase.rpc("equipes_des_projets", { p_ids: ids });
  if (error) return parProjet;
  for (const l of (data ?? []) as Ligne[]) {
    const eq = parProjet.get(l.project_id) ?? { total: 0, metiers: [], portraits: [] };
    eq.total += 1;
    if (l.role && !eq.metiers.includes(l.role)) eq.metiers.push(l.role);
    // Sans photo, ou pas encore inscrit : la lettre du métier.
    if (eq.portraits.length < NB_PORTRAITS_EQUIPE) {
      eq.portraits.push({
        id: l.profile_id ?? `sans-compte-${eq.total}`,
        src: l.profile_id && l.avatar_url ? (flou(l.project_id) ? `/api/talents/photo?id=${l.profile_id}` : photoNette(l.avatar_url)) : null,
        lettre: lettreDuMetier(l.role),
      });
    }
    parProjet.set(l.project_id, eq);
  }
  return parProjet;
}

/**
 * Les photos de l'équipe sont floutées, sauf pour l'administration et sur
 * les projets que le membre a ouverts avec un Gravity (12/11 ; avant :
 * nettes pour tout adhérent).
 */
export async function lectureRestreinte(
  supabase: SupabaseClient,
  userId: string | null | undefined,
): Promise<(projetId: string) => boolean> {
  if (!userId) return () => true;
  const [{ data: admin }, { data: ouverts }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.from("gravity_ouvertures").select("project_id").eq("profile_id", userId),
  ]);
  if (admin === true) return () => false;
  const ids = new Set(((ouverts ?? []) as { project_id: string }[]).map((o) => o.project_id));
  return (projetId) => !ids.has(projetId);
}
