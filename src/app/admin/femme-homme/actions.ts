"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Sarah tranche femme / homme pour un auteur (28/11/2026) : « femme »,
 * « homme », ou null = on laisse de côté (il ne compte pas dans les
 * statistiques). Gardé dans profils_femme_homme (0336), source « Sarah ».
 */
export async function trancherFemmeHomme(
  profileId: string,
  valeur: "femme" | "homme" | null,
): Promise<{ ok: true } | { erreur: string }> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return { erreur: "Réservé à l'administration." };
  const admin = createAdminClient();
  if (!admin || !profileId) return { erreur: "L'enregistrement a échoué. Réessayez dans un instant." };
  const { error } = await admin
    .from("profils_femme_homme")
    .upsert(
      { profile_id: profileId, valeur, source: valeur ? "Sarah" : "laisse de cote", pose_le: new Date().toISOString() },
      { onConflict: "profile_id" },
    );
  if (error) {
    console.error("Femme / homme : échec", error.message);
    return { erreur: "L'enregistrement a échoué. Réessayez dans un instant." };
  }
  revalidatePath("/admin/femme-homme");
  return { ok: true };
}
