"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { chargerProjetAModifier } from "../../blocs";
import { IMAGES, MAX_MOODBOARD, deposerImage, deposerScenario, recadrerEn16x9, retirerImages } from "../fichiers";

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

  // L'image de présentation (03/10) : l'image complète est gardée (kind
  // « vignette_origine »), la vignette affichée partout est une copie 16/9
  // recadrée sur la partie choisie. Sans nouveau fichier, on peut seulement
  // avoir déplacé l'image : on recadre alors l'origine (ou la vignette
  // actuelle, qui devient l'origine).
  const nombre = (v: FormDataEntryValue | null) => (v === null || v === "" ? 50 : Number(v));
  const aDeplace = formData.get("vignette_x") !== null || formData.get("vignette_y") !== null;
  const posX = nombre(formData.get("vignette_x"));
  const posY = nombre(formData.get("vignette_y"));
  const nouvelle = !!vignette && vignette.size > 0;

  if (nouvelle || aDeplace) {
    const { data: anciennes } = await supabase
      .from("project_files")
      .select("id, kind, storage_path")
      .eq("project_id", id)
      .in("kind", ["vignette", "vignette_origine"])
      .returns<{ id: string; kind: string; storage_path: string }[]>();
    const vignetteActuelle = (anciennes ?? []).find((a) => a.kind === "vignette");
    const origineActuelle = (anciennes ?? []).find((a) => a.kind === "vignette_origine");

    let cheminOrigine: string | null;
    if (nouvelle) {
      cheminOrigine = await deposerImage(supabase, projet.owner_id, id, vignette, "vignette");
      if (!cheminOrigine) {
        echec("L'image de présentation n'a pas pu être enregistrée. Réessayez, ou écrivez-nous.");
      }
    } else {
      cheminOrigine = origineActuelle?.storage_path ?? vignetteActuelle?.storage_path ?? null;
    }

    if (cheminOrigine) {
      const copie = await recadrerEn16x9(supabase, projet.owner_id, id, cheminOrigine, posX, posY);
      if (!copie) {
        echec("L'image de présentation n'a pas pu être recadrée. Réessayez, ou écrivez-nous.");
      }
      await supabase.from("project_files").insert([
        { project_id: id, storage_path: copie, kind: "vignette", original_name: vignette?.name || "vignette" },
        ...(nouvelle || !origineActuelle
          ? [{ project_id: id, storage_path: cheminOrigine, kind: "vignette_origine", original_name: vignette?.name || null }]
          : []),
      ]);
      // On retire les anciennes lignes, et les fichiers qui ne servent plus.
      const aGarder = new Set([cheminOrigine]);
      const aRetirer = (anciennes ?? []).filter((a) => !(a.kind === "vignette_origine" && !nouvelle) && !aGarder.has(a.storage_path));
      const anciennesLignes = (anciennes ?? []).filter((a) => !(a.kind === "vignette_origine" && !nouvelle));
      if (anciennesLignes.length) {
        await supabase.from("project_files").delete().in("id", anciennesLignes.map((a) => a.id));
      }
      await retirerImages(supabase, aRetirer.map((a) => a.storage_path));
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
