"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const FORMATS = [
  "long_metrage",
  "court_metrage",
  "serie",
  "documentaire",
  "animation",
  "immersif_360_vr",
];

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/deposer");
  }

  const title = (formData.get("title") as string)?.trim();
  const logline = (formData.get("logline") as string)?.trim();
  const synopsis = (formData.get("synopsis") as string)?.trim();
  const format = formData.get("format") as string;
  const genreSlug = (formData.get("genre_slug") as string)?.trim();
  const file = formData.get("scenario") as File | null;

  if (!title) {
    redirect("/deposer?erreur=" + encodeURIComponent("Le titre est obligatoire."));
  }
  if (format && !FORMATS.includes(format)) {
    redirect("/deposer?erreur=" + encodeURIComponent("Format de projet invalide."));
  }
  if (file && file.size > 0 && file.type !== "application/pdf") {
    redirect("/deposer?erreur=" + encodeURIComponent("Le scénario doit être un fichier PDF."));
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      owner_id: user.id,
      title,
      logline: logline || null,
      synopsis: synopsis || null,
      format: format || null,
      genre_slug: genreSlug || null,
      status: "depose",
    })
    .select("id")
    .single();

  if (error || !project) {
    redirect(
      "/deposer?erreur=" +
        encodeURIComponent(error?.message ?? "Une erreur est survenue, réessaie."),
    );
  }

  if (file && file.size > 0) {
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("scenarios")
      .upload(path, file, { contentType: "application/pdf" });

    if (!uploadError) {
      await supabase.from("project_files").insert({
        project_id: project.id,
        storage_path: path,
        kind: "scenario",
        original_name: file.name,
      });
    }
    // Le projet est déjà créé : un échec d'upload n'annule pas le dépôt,
    // l'auteur pourra rajouter le fichier depuis son profil.
  }

  redirect("/deposer/merci");
}
