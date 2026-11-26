"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Sarah tranche un nom des sélections proche d'un profil (26/11/2026) :
 * « meme » = le nom de la liste désigne ce profil (il sort de l'onglet des
 * auteurs sans profil et mène au profil dans « Notre histoire ») ; « autre »
 * = ce n'est pas la même personne, la paire n'est plus proposée.
 */
export async function trancherNomProche(
  cle: string,
  nom: string,
  profileId: string,
  decision: "meme" | "autre",
): Promise<{ ok: true } | { erreur: string }> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return { erreur: "Réservé à l'administration." };
  const admin = createAdminClient();
  if (!admin || !cle || !profileId) return { erreur: "L'enregistrement a échoué. Réessayez dans un instant." };
  const { error } = await admin
    .from("selections_noms_rapproches")
    .upsert({ cle, nom, profile_id: profileId, decision, decide_le: new Date().toISOString() }, { onConflict: "cle,profile_id" });
  if (error) {
    console.error("Nom proche : échec", error.message);
    return { erreur: "L'enregistrement a échoué. Réessayez dans un instant." };
  }
  revalidatePath("/admin/noms-proches");
  revalidatePath("/admin/auteurs-selectionnes");
  return { ok: true };
}
