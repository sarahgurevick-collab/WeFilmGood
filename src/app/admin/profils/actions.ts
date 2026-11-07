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
 *
 * Renvoie le nouvel état (ou null si rien n'a été enregistré) : le bouton
 * change de couleur dès la réponse, sans attendre que toute la page des
 * membres soit recalculée (07/11/2026, Sarah : « Il ne se passe rien »).
 */
export async function basculerValidation(
  profileId: string,
  vers: "validee" | "refusee",
): Promise<"validee" | "refusee" | null> {
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("is_admin");
  if (admin !== true) redirect("/");
  if (!profileId || !["validee", "refusee"].includes(vers)) return null;

  const { error } = await supabase.rpc("admin_set_profile_validation", {
    p_profile_id: profileId,
    p_status: vers,
  });
  if (error) {
    console.error("Validation non enregistrée :", error.message);
    return null;
  }

  revalidatePath("/admin/membres");
  return vers;
}
