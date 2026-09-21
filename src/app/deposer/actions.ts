"use server";

import { redirect } from "next/navigation";
import { alleger } from "@/lib/image";
import { createClient } from "@/lib/supabase/server";
import { echapper, envoyerEmail } from "@/lib/brevo";

// Un documentaire ou un film d'animation n'est pas un format : selon sa
// durée, c'est un long ou un court métrage.
const FORMATS = ["long_metrage", "court_metrage", "serie", "immersif_360_vr"];

const IMAGES = ["image/jpeg", "image/png"];

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
  const vignette = formData.get("vignette") as File | null;

  if (!title) {
    redirect("/deposer?erreur=" + encodeURIComponent("Le titre est obligatoire."));
  }
  if (format && !FORMATS.includes(format)) {
    redirect("/deposer?erreur=" + encodeURIComponent("Format de projet invalide."));
  }
  if (file && file.size > 0 && file.type !== "application/pdf") {
    redirect("/deposer?erreur=" + encodeURIComponent("Le scénario doit être un fichier PDF."));
  }
  if (vignette && vignette.size > 0 && !IMAGES.includes(vignette.type)) {
    redirect(
      "/deposer?erreur=" + encodeURIComponent("La vignette doit être une image JPG ou PNG."),
    );
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

  // La vignette part dans un espace public : c'est elle qui illustre la
  // pitchothèque, contrairement au scénario qui reste confidentiel.
  if (vignette && vignette.size > 0) {
    // Allégée avant d'être stockée : les auteurs déposent des photos de
    // 15 à 20 Mo pour une vignette affichée à 400 pixels. Transparent
    // pour eux, rien à régler.
    const image = await alleger(vignette);
    const path = `${user.id}/${project.id}-${Date.now()}`;
    const { error: uploadError } = await supabase.storage
      .from("project-media")
      .upload(path, image.donnees, { contentType: image.type });

    if (!uploadError) {
      await supabase.from("project_files").insert({
        project_id: project.id,
        storage_path: path,
        kind: "vignette",
        original_name: vignette.name,
      });
    }
  }

  if (user.email) {
    await envoyerEmail({
      to: [{ email: user.email }],
      subject: `Votre fiche projet « ${title} » est créée`,
      htmlContent: `
        <p>Bonjour,</p>
        <p>Votre fiche projet <strong>${echapper(title)}</strong> est créée sur WeFilmGood. Vous pouvez la compléter ou la modifier à tout moment depuis la page de votre projet.</p>
      `,
    });
  }

  redirect("/deposer/merci");
}
