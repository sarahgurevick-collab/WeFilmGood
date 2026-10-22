import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { COLONNES, type Depot } from "@/lib/videopitch";

/**
 * Qui a le droit de quoi sur les dépôts de videopitch. Les lectures et les
 * écritures passent par le client à privilèges : la base n'ouvre la table
 * qu'en lecture aux auteurs (migration 0192).
 */

export async function utilisateur() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: admin } = await supabase.rpc("is_admin");
  return { id: user.id, estAdmin: admin === true, supabase };
}

/**
 * Déposer un videopitch : le porteur du projet, s'il est adhérent (le
 * videopitch fait partie de l'adhésion), ou l'administration à sa place.
 */
export async function peutDeposer(projectId: string) {
  const u = await utilisateur();
  if (!u) return null;
  const { data: projet } = await u.supabase
    .from("projects")
    .select("id, owner_id, title")
    .eq("id", projectId)
    .maybeSingle<{ id: string; owner_id: string; title: string }>();
  if (!projet) return null;
  if (u.estAdmin) return { ...u, projet };
  if (projet.owner_id !== u.id) return null;
  const { data: adherent } = await u.supabase.rpc("a_une_adhesion_active", { p_profile_id: u.id });
  return adherent === true ? { ...u, projet } : null;
}

/** Un dépôt, si la personne connectée en est l'auteur (ou l'admin). */
export async function depotDe(id: string) {
  const u = await utilisateur();
  const admin = createAdminClient();
  if (!u || !admin) return null;
  const { data: depot } = await admin
    .from("videopitch_depots")
    .select(COLONNES)
    .eq("id", id)
    .maybeSingle<Depot>();
  if (!depot) return null;
  if (u.estAdmin || depot.deposant_id === u.id) return { ...u, depot, admin };
  const { data: projet } = await admin.from("projects").select("owner_id").eq("id", depot.project_id).maybeSingle();
  return projet?.owner_id === u.id ? { ...u, depot, admin } : null;
}
