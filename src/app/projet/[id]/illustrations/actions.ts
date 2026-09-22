"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { chargerProjetAModifier } from "../../blocs";
import { IMAGES, MAX_MOODBOARD, deposerImage, retirerImages } from "../fichiers";

/**
 * Bloc 2 — enregistre l'image de présentation (une seule : la nouvelle
 * remplace l'ancienne) et ajoute des images au mood board.
 */
export async function enregistrerIllustrations(formData: FormData) {
  const id = formData.get("project_id") as string;
  const { supabase, projet } = await chargerProjetAModifier(id, "illustrations");

  const echec: (message: string) => never = (message) =>
    redirect(`/projet/${id}/illustrations?erreur=${encodeURIComponent(message)}`);

  const vignette = formData.get("vignette") as File | null;
  const moodboard = (formData.getAll("moodboard") as (File | string)[]).filter(
    (f): f is File => f instanceof File && f.size > 0,
  );

  if (vignette && vignette.size > 0 && !IMAGES.includes(vignette.type)) {
    echec("L'image de présentation doit être un JPG ou un PNG.");
  }
  if (moodboard.some((f) => !IMAGES.includes(f.type))) {
    echec("Le mood board n'accepte que des images JPG ou PNG.");
  }

  const { count: existantes } = await supabase
    .from("project_files")
    .select("id", { count: "exact", head: true })
    .eq("project_id", id)
    .eq("kind", "moodboard");
  if ((existantes ?? 0) + moodboard.length > MAX_MOODBOARD) {
    echec(`Le mood board tient en ${MAX_MOODBOARD} images au plus.`);
  }

  if (vignette && vignette.size > 0) {
    const chemin = await deposerImage(supabase, projet.owner_id, id, vignette, "vignette");
    if (!chemin) {
      echec("L'image de présentation n'a pas pu être enregistrée. Réessayez, ou écrivez-nous.");
    }
    const { data: anciennes } = await supabase
      .from("project_files")
      .select("id, storage_path")
      .eq("project_id", id)
      .eq("kind", "vignette")
      .returns<{ id: string; storage_path: string }[]>();
    await supabase.from("project_files").insert({
      project_id: id,
      storage_path: chemin,
      kind: "vignette",
      original_name: vignette.name,
    });
    if (anciennes?.length) {
      await supabase
        .from("project_files")
        .delete()
        .in(
          "id",
          anciennes.map((a) => a.id),
        );
      await retirerImages(
        supabase,
        anciennes.map((a) => a.storage_path),
      );
    }
  }

  for (const image of moodboard) {
    const chemin = await deposerImage(supabase, projet.owner_id, id, image, "moodboard");
    if (!chemin) {
      echec("Une image du mood board n'a pas pu être enregistrée. Réessayez, ou écrivez-nous.");
    }
    await supabase.from("project_files").insert({
      project_id: id,
      storage_path: chemin,
      kind: "moodboard",
      original_name: image.name,
    });
  }

  revalidatePath(`/projet/${id}`);
  redirect(`/projet/${id}/illustrations?enregistre=1`);
}

/** Retire une image du mood board (ou la vignette). Jamais le scénario. */
export async function retirerImage(formData: FormData) {
  const id = formData.get("project_id") as string;
  const fileId = formData.get("file_id") as string;
  const { supabase } = await chargerProjetAModifier(id, "illustrations");

  const { data: fichier } = await supabase
    .from("project_files")
    .select("id, kind, storage_path")
    .eq("id", fileId)
    .eq("project_id", id)
    .maybeSingle<{ id: string; kind: string; storage_path: string }>();

  if (fichier && fichier.kind !== "scenario") {
    await supabase.from("project_files").delete().eq("id", fichier.id);
    await retirerImages(supabase, [fichier.storage_path]);
  }

  revalidatePath(`/projet/${id}`);
  redirect(`/projet/${id}/illustrations`);
}
