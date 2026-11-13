"use server";

import { revalidatePath } from "next/cache";
import { estLeCinecrush } from "@/lib/comedypitch";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Envoyer une étoile filante à un ComedyPitch (13/11/2026 ; signe décidé
 * par Sarah et Nicolas le 12/11) : une seule par personne, jamais à soi-même,
 * et seulement si l'on a le droit de regarder ce ComedyPitch.
 */
export async function envoyerEtoileFilante(depotId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const admin = createAdminClient();
  if (!user || !admin) return false;

  const { data: depot } = await admin
    .from("videopitch_depots")
    .select("id, project_id, deposant_id")
    .eq("id", depotId)
    .eq("genre", "comedypitch")
    .eq("etat", "valide")
    .maybeSingle<{ id: string; project_id: string; deposant_id: string }>();
  if (!depot || depot.deposant_id === user.id) return false;

  // Mêmes droits que pour le regarder : la fiche ouverte (son projet, son
  // équipe, l'administration, un soleil dépensé), ou le CinéCrush de la semaine.
  const [{ data: estAdmin }, { data: ouverture }, { data: projet }, { data: equipier }, cinecrush] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.from("gravity_ouvertures").select("project_id").eq("profile_id", user.id).eq("project_id", depot.project_id).maybeSingle(),
    admin.from("projects").select("owner_id").eq("id", depot.project_id).maybeSingle<{ owner_id: string }>(),
    admin.from("project_co_authors").select("profile_id").eq("project_id", depot.project_id).eq("profile_id", user.id).eq("status", "accepte").maybeSingle(),
    estLeCinecrush(admin, depot.project_id),
  ]);
  if (!(estAdmin === true || ouverture || projet?.owner_id === user.id || equipier || cinecrush)) return false;

  const { error } = await admin
    .from("comedypitch_etoiles")
    .upsert({ depot_id: depotId, profile_id: user.id }, { onConflict: "depot_id,profile_id", ignoreDuplicates: true });
  if (error) return false;
  revalidatePath(`/projet/${depot.project_id}`);
  return true;
}
