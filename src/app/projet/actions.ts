"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { echapper, envoyerEmail } from "@/lib/brevo";
import { deposerScenario } from "./[id]/fichiers";

// Un documentaire ou un film d'animation n'est pas un format : selon sa
// durée, c'est un long ou un court métrage.
const FORMATS = ["long_metrage", "court_metrage", "serie", "immersif_360_vr"];

/**
 * Bloc 1 — crée la fiche. Une fois le projet créé, on enchaîne sur le
 * bloc 2, les illustrations : la vignette ne se dépose plus ici.
 */
export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/projet");
  }

  const echec: (message: string) => never = (message) =>
    redirect("/projet?erreur=" + encodeURIComponent(message));

  const title = (formData.get("title") as string)?.trim();
  const logline = (formData.get("logline") as string)?.trim();
  const synopsis = (formData.get("synopsis") as string)?.trim();
  const format = formData.get("format") as string;
  const genreSlug = (formData.get("genre_slug") as string)?.trim();
  const hasAwards = formData.get("has_awards") === "oui";
  const awardsDetail = hasAwards ? (formData.get("awards_detail") as string)?.trim() || null : null;
  const scenario = formData.get("scenario") as File | null;

  if (!title) echec("Le titre est obligatoire.");
  if (format && !FORMATS.includes(format)) echec("Format de projet invalide.");
  if (scenario && scenario.size > 0 && scenario.type !== "application/pdf") {
    echec("Le scénario doit être un fichier PDF.");
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
      has_awards: hasAwards,
      awards_detail: awardsDetail,
      status: "depose",
    })
    .select("id")
    .single();

  if (error || !project) {
    echec(error?.message ?? "Une erreur est survenue, réessayez.");
  }

  // Le projet est déjà créé : un échec d'envoi n'annule pas la fiche,
  // l'auteur pourra redéposer le fichier depuis le bloc 1.
  let avertissement: string | null = null;
  if (scenario && scenario.size > 0) {
    const depose = await deposerScenario(supabase, user.id, project.id, scenario);
    if (!depose) {
      avertissement =
        "Votre fiche est créée, mais le scénario n'a pas pu être enregistré. Vous pourrez le redéposer depuis le bloc « La fiche ».";
    }
  }

  if (user.email) {
    await envoyerEmail({
      to: [{ email: user.email }],
      subject: `Votre fiche projet « ${title} » est créée`,
      htmlContent: `
        <p>Bonjour,</p>
        <p>Votre fiche projet <strong>${echapper(title)}</strong> est créée sur WeFilmGood. Vous pouvez la compléter ou la modifier à tout moment depuis la page de votre projet : ses illustrations, ses personnages.</p>
      `,
    });
  }

  redirect(
    `/projet/${project.id}/illustrations?cree=1` +
      (avertissement ? `&erreur=${encodeURIComponent(avertissement)}` : ""),
  );
}
