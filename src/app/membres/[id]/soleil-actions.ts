"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Ouvrir le profil d'un talent avec un soleil (16/11, Sarah : contacter un
 * talent sans passer par un projet, « Oui, 1 soleil »). La base décide
 * (ouvrir_profil, 0285) : le soleil du jour d'abord, puis le Pack Soleils.
 */
export async function ouvrirProfilAvecSoleil(formData: FormData) {
  const id = String(formData.get("membre") ?? "");
  if (!UUID.test(id)) redirect("/galaxies");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/membres/${id}`);
  const { data, error } = await supabase.rpc("ouvrir_profil", { p_membre: id });
  if (error) console.error("ouvrir_profil :", error.message);
  if (data === "sans_soleil") redirect("/adhesion#pack-soleils");
  revalidatePath(`/membres/${id}`);
  redirect(`/membres/${id}`);
}
