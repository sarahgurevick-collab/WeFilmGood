"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { chargerProjetAModifier } from "../../blocs";
import { IMAGES, MAX_MOODBOARD, deposerImage, deposerScenario, retirerImages } from "../fichiers";

/**
 * Bloc 2 — enregistre l'image de présentation (une seule : la nouvelle
 * remplace l'ancienne), ajoute des photos au Moodboard, et dépose le
 * scénario en PDF.
 */
export async function enregistrerDocuments(formData: FormData) {
  const id = formData.get("project_id") as string;
  const { supabase, projet } = await chargerProjetAModifier(id, "documents");

  const echec: (message: string) => never = (message) =>
    redirect(`/projet/${id}/documents?erreur=${encodeURIComponent(message)}`);

  const vignette = formData.get("vignette") as File | null;
  const moodboard = (formData.getAll("moodboard") as (File | string)[]).filter(
    (f): f is File => f instanceof File && f.size > 0,
  );

  if (vignette && vignette.size > 0 && !IMAGES.includes(vignette.type)) {
    echec("L'image de présentation doit être un JPG ou un PNG.");
  }
  if (moodboard.some((f) => !IMAGES.includes(f.type))) {
    echec("Le Moodboard n'accepte que des photos JPG ou PNG.");
  }
  const scenario = formData.get("scenario") as File | null;
  if (scenario && scenario.size > 0 && scenario.type !== "application/pdf") {
    echec("Le scénario doit être un fichier PDF.");
  }

  const { count: existantes } = await supabase
    .from("project_files")
    .select("id", { count: "exact", head: true })
    .eq("project_id", id)
    .eq("kind", "moodboard");
  if ((existantes ?? 0) + moodboard.length > MAX_MOODBOARD) {
    echec(`Le Moodboard tient en ${MAX_MOODBOARD} photos au plus.`);
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
      echec("Une photo du Moodboard n'a pas pu être enregistrée. Réessayez, ou écrivez-nous.");
    }
    await supabase.from("project_files").insert({
      project_id: id,
      storage_path: chemin,
      kind: "moodboard",
      original_name: image.name,
    });
  }

  if (scenario && scenario.size > 0) {
    const depose = await deposerScenario(supabase, projet.owner_id, id, scenario);
    if (!depose) echec("Le scénario n'a pas pu être enregistré. Réessayez, ou écrivez-nous.");
  }

  revalidatePath(`/projet/${id}`);
  redirect(`/projet/${id}/documents?enregistre=1`);
}

/** Retire une photo du Moodboard (ou la vignette). Jamais le scénario. */
export async function retirerImage(formData: FormData) {
  const id = formData.get("project_id") as string;
  const fileId = formData.get("file_id") as string;
  const { supabase } = await chargerProjetAModifier(id, "documents");

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
  redirect(`/projet/${id}/documents`);
}
