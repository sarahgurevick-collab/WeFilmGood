"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/i;

/** Dépenser son Gravity du jour sur ce projet (la base décide : fonction ouvrir_projet). */
export async function ouvrirAvecGravity(formData: FormData) {
  const id = String(formData.get("projet") ?? "");
  if (!UUID.test(id)) redirect("/galaxies");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/projet/${id}`);
  const { data, error } = await supabase.rpc("ouvrir_projet", { p_project_id: id });
  if (error) console.error("ouvrir_projet :", error.message);
  if (data === "sans_adhesion") redirect("/adhesion");
  revalidatePath(`/projet/${id}`);
  revalidatePath("/favoris");
  redirect(`/projet/${id}`);
}

/** Mettre un projet de côté, ou le retirer (le cœur). */
export async function basculerFavori(formData: FormData) {
  const id = String(formData.get("projet") ?? "");
  const retour = String(formData.get("retour") ?? "") === "favoris" ? "/favoris" : `/projet/${id}`;
  if (!UUID.test(id)) redirect("/galaxies");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/projet/${id}`);
  // La liste est un avantage de l'adhésion (04/10 : à 0 €, « carnet et crayon »).
  const { data: adherent } = await supabase.rpc("a_une_adhesion_active", { p_profile_id: user.id });
  if (adherent !== true) redirect("/adhesion");
  const { data: deja } = await supabase
    .from("favoris")
    .select("project_id")
    .eq("profile_id", user.id)
    .eq("project_id", id)
    .maybeSingle();
  if (deja) await supabase.from("favoris").delete().eq("profile_id", user.id).eq("project_id", id);
  else await supabase.from("favoris").insert({ profile_id: user.id, project_id: id });
  revalidatePath(`/projet/${id}`);
  revalidatePath("/favoris");
  redirect(retour);
}
