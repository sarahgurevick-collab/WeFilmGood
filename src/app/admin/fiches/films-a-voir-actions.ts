"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function admin() {
  const supabase = await createClient();
  const { data: estAdmin } = await supabase.rpc("is_admin");
  if (estAdmin !== true) redirect("/");
  return supabase;
}

const retourSur = (f: FormData) => {
  const r = String(f.get("retour") ?? "");
  return r.startsWith("/") && !r.startsWith("//") ? r : "/admin/fiches";
};

/** Ajoute un film aux « Films à voir » d'un projet (déjà présent : rien ne change). */
export async function ajouterFilmAVoir(formData: FormData) {
  const supabase = await admin();
  const project_id = String(formData.get("project_id") ?? "");
  const film_id = Number(formData.get("film_id"));
  if (/^[0-9a-f-]{36}$/i.test(project_id) && Number.isInteger(film_id)) {
    const commentaire = String(formData.get("commentaire") ?? "").trim() || null;
    await supabase
      .from("projet_films_a_voir")
      .upsert({ project_id, film_id, commentaire }, { onConflict: "project_id,film_id", ignoreDuplicates: true });
    revalidatePath(`/projet/${project_id}/fiches`);
  }
  redirect(retourSur(formData));
}

export async function retirerFilmAVoir(formData: FormData) {
  const supabase = await admin();
  await supabase.from("projet_films_a_voir").delete().eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/projet", "layout");
  redirect(retourSur(formData));
}

export async function commenterFilmAVoir(formData: FormData) {
  const supabase = await admin();
  await supabase
    .from("projet_films_a_voir")
    .update({ commentaire: String(formData.get("commentaire") ?? "").trim() || null })
    .eq("id", String(formData.get("id") ?? ""));
  revalidatePath("/projet", "layout");
  redirect(retourSur(formData));
}
