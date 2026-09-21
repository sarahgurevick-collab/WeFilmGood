"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { alleger } from "@/lib/image";
import { createClient } from "@/lib/supabase/server";

const FORMATS = ["long_metrage", "court_metrage", "serie", "immersif_360_vr"];

const IMAGES = ["image/jpeg", "image/png"];

/**
 * Enregistre les corrections apportées à une fiche projet.
 *
 * Accessible à l'auteur et à l'administration — qui corrige souvent les
 * fiches à la place des auteurs, fautes d'orthographe comprises. La
 * règle d'accès est dans la base : inutile de la redoubler ici, une
 * tentative illégitime n'écrira rien.
 *
 * Le label n'est pas touché : il récompense la lecture du scénario, pas
 * le texte de présentation. Un auteur ne peut ni se l'attribuer ni le
 * perdre en retravaillant sa fiche.
 */
export async function modifierProjet(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const id = formData.get("project_id") as string;
  if (!user) redirect(`/connexion?next=/projet/${id}/modifier`);

  const echec = (message: string) =>
    redirect(`/projet/${id}/modifier?erreur=${encodeURIComponent(message)}`);

  const title = (formData.get("title") as string)?.trim();
  const logline = (formData.get("logline") as string)?.trim();
  const synopsis = (formData.get("synopsis") as string)?.trim();
  const format = formData.get("format") as string;
  const genreSlug = (formData.get("genre_slug") as string)?.trim();
  const vignette = formData.get("vignette") as File | null;
  const scenario = formData.get("scenario") as File | null;

  if (!title) echec("Le titre est obligatoire.");
  if (format && !FORMATS.includes(format)) echec("Format de projet invalide.");
  if (scenario && scenario.size > 0 && scenario.type !== "application/pdf") {
    echec("Le scénario doit être un fichier PDF.");
  }
  if (vignette && vignette.size > 0 && !IMAGES.includes(vignette.type)) {
    echec("La vignette doit être une image JPG ou PNG.");
  }

  const { error } = await supabase
    .from("projects")
    .update({
      title,
      logline: logline || null,
      synopsis: synopsis || null,
      format: format || null,
      genre_slug: genreSlug || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) echec(error.message);

  const { data: projet } = await supabase
    .from("projects")
    .select("owner_id")
    .eq("id", id)
    .maybeSingle<{ owner_id: string }>();

  if (projet) {
    if (vignette && vignette.size > 0) {
      // Allégée comme au dépôt : 15 Mo pour une image affichée à 400 pixels.
      const image = await alleger(vignette);
      const chemin = `${projet.owner_id}/${id}-${Date.now()}`;
      const { error: envoi } = await supabase.storage
        .from("project-media")
        .upload(chemin, image.donnees, { contentType: image.type });
      if (!envoi) {
        await supabase.from("project_files").insert({
          project_id: id,
          storage_path: chemin,
          kind: "vignette",
          original_name: vignette.name,
        });
      }
    }

    if (scenario && scenario.size > 0) {
      const chemin = `${projet.owner_id}/${Date.now()}-${scenario.name}`;
      const { error: envoi } = await supabase.storage
        .from("scenarios")
        .upload(chemin, scenario, { contentType: "application/pdf" });
      if (!envoi) {
        await supabase.from("project_files").insert({
          project_id: id,
          storage_path: chemin,
          kind: "scenario",
          original_name: scenario.name,
        });
      }
    }
  }

  revalidatePath(`/projet/${id}`);
  redirect(`/projet/${id}`);
}
