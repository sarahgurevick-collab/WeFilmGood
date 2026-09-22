"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { chargerProjetAModifier } from "../../blocs";
import { IMAGES, deposerImage, retirerImages } from "../fichiers";
import { AGES, GENRES_PERSONNAGE, TYPES } from "./options";

const parmi = (liste: { value: string }[], valeur: FormDataEntryValue | null) => {
  const v = typeof valeur === "string" ? valeur : "";
  return liste.some((o) => o.value === v) ? v : null;
};

/** Bloc 3 — ajoute un personnage, ou enregistre celui dont l'identifiant est fourni. */
export async function enregistrerPersonnage(formData: FormData) {
  const id = formData.get("project_id") as string;
  const characterId = (formData.get("character_id") as string | null) || null;
  const { supabase, projet } = await chargerProjetAModifier(id, "personnages");

  const echec: (message: string) => never = (message) =>
    redirect(`/projet/${id}/personnages?erreur=${encodeURIComponent(message)}`);

  const name = (formData.get("name") as string)?.trim();
  if (!name) echec("Le nom du personnage est obligatoire.");

  const characterType = parmi(TYPES, formData.get("character_type"));
  const gender = parmi(GENRES_PERSONNAGE, formData.get("gender"));
  const ageRange = parmi(AGES, formData.get("age_range"));
  const biography = (formData.get("biography") as string)?.trim() || null;
  const photo = formData.get("photo") as File | null;

  if (photo && photo.size > 0 && !IMAGES.includes(photo.type)) {
    echec("Le portrait doit être une image JPG ou PNG.");
  }

  let photoPath: string | null = null;
  if (photo && photo.size > 0) {
    photoPath = await deposerImage(supabase, projet.owner_id, id, photo, "personnage");
    if (!photoPath) echec("Le portrait n'a pas pu être enregistré. Réessayez, ou écrivez-nous.");
  }

  if (characterId) {
    const { data: ancien } = await supabase
      .from("characters")
      .select("photo_path")
      .eq("id", characterId)
      .eq("project_id", id)
      .maybeSingle<{ photo_path: string | null }>();

    const { error } = await supabase
      .from("characters")
      .update({
        name,
        character_type: characterType,
        gender,
        age_range: ageRange,
        biography,
        ...(photoPath ? { photo_path: photoPath } : {}),
      })
      .eq("id", characterId)
      .eq("project_id", id);
    if (error) echec(error.message);

    if (photoPath && ancien?.photo_path) await retirerImages(supabase, [ancien.photo_path]);
  } else {
    const { count } = await supabase
      .from("characters")
      .select("id", { count: "exact", head: true })
      .eq("project_id", id);

    const { error } = await supabase.from("characters").insert({
      project_id: id,
      name,
      character_type: characterType,
      gender,
      age_range: ageRange,
      biography,
      photo_path: photoPath,
      position: count ?? 0,
    });
    if (error) echec(error.message);
  }

  revalidatePath(`/projet/${id}`);
  redirect(`/projet/${id}/personnages?enregistre=1`);
}

/** Retire un personnage, et son portrait avec lui. */
export async function retirerPersonnage(formData: FormData) {
  const id = formData.get("project_id") as string;
  const characterId = formData.get("character_id") as string;
  const { supabase } = await chargerProjetAModifier(id, "personnages");

  const { data: personnage } = await supabase
    .from("characters")
    .select("id, photo_path")
    .eq("id", characterId)
    .eq("project_id", id)
    .maybeSingle<{ id: string; photo_path: string | null }>();

  if (personnage) {
    await supabase.from("characters").delete().eq("id", personnage.id);
    if (personnage.photo_path) await retirerImages(supabase, [personnage.photo_path]);
  }

  revalidatePath(`/projet/${id}`);
  redirect(`/projet/${id}/personnages`);
}
