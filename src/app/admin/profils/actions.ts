"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Bascule la validation d'un profil.
 *
 * Le corps de métier principal suppose au moins une expérience
 * professionnelle sur un film : c'est l'administration qui en juge, sur
 * la référence fournie. Les compétences supplémentaires, elles, ne sont
 * pas vérifiées — on fait confiance.
 *
 * Par défaut un profil qui a fourni une référence est présumé valable :
 * l'administration n'intervient que pour écarter une référence factice.
 */
export async function basculerValidation(formData: FormData) {
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("is_admin");
  if (admin !== true) redirect("/");

  const profileId = formData.get("profile_id") as string;
  const vers = formData.get("vers") as string;
  if (!profileId || !["validee", "refusee"].includes(vers)) {
    redirect("/admin/profils");
  }

  await supabase.rpc("admin_set_profile_validation", {
    p_profile_id: profileId,
    p_status: vers,
  });

  revalidatePath("/admin/profils");
}
