"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { chargerProjetAModifier } from "../../blocs";
import { AUDIENCES, BUDGETS } from "../../ChampsFiche";
import { POSTURES, TECHNIQUES } from "../../formes";

const FORMATS = ["long_metrage", "court_metrage", "serie", "immersif_360_vr"];
const VALEURS_BUDGET = BUDGETS.map((b) => b.value);
const VALEURS_AUDIENCE = AUDIENCES.map((a) => a.value);
const VALEURS_POSTURE = POSTURES.map((p) => p.value);
const VALEURS_TECHNIQUE = TECHNIQUES.map((t) => t.value);

/**
 * Enregistre le bloc 1 d'une fiche projet.
 *
 * Accessible à l'auteur et à l'administration — qui corrige souvent les
 * fiches à la place des auteurs, fautes d'orthographe comprises.
 *
 * Le label n'est pas touché : il récompense la lecture du scénario, pas
 * le texte de présentation. Un auteur ne peut ni se l'attribuer ni le
 * perdre en retravaillant sa fiche.
 */
export async function modifierProjet(formData: FormData) {
  const id = formData.get("project_id") as string;
  const { supabase, projet } = await chargerProjetAModifier(id, "fiche");

  const echec: (message: string) => never = (message) =>
    redirect(`/projet/${id}/modifier?erreur=${encodeURIComponent(message)}`);

  const title = (formData.get("title") as string)?.trim();
  const tagline = (formData.get("tagline") as string)?.trim();
  const logline = (formData.get("logline") as string)?.trim();
  const synopsis = (formData.get("synopsis") as string)?.trim();
  const format = formData.get("format") as string;
  const genreSlug = (formData.get("genre_slug") as string)?.trim();
  // Marches 3 et 4 du genre (04/11) : au moins une case chacune.
  const postures = formData.getAll("postures").map(String).filter((v) => VALEURS_POSTURE.includes(v)).slice(0, 1);
  const techniques = formData.getAll("techniques").map(String).filter((v) => VALEURS_TECHNIQUE.includes(v));
  const budgetRange = formData.get("budget_range") as string;
  const targetAudience = formData.get("target_audience") as string;
  // Une sélection de la Maison des Scénaristes compte comme une distinction :
  // l'auteur ne peut pas fermer l'interrupteur.
  const { count: nbSelections } = await supabase
    .from("project_selections")
    .select("project_id", { count: "exact", head: true })
    .eq("project_id", id);
  const hasAwards = formData.get("has_awards") === "oui" || (nbSelections ?? 0) > 0;
  const awardsDetail = hasAwards ? (formData.get("awards_detail") as string)?.trim() || null : null;

  if (!title) echec("Le titre est obligatoire.");
  if (!tagline) echec("La tagline est obligatoire.");
  if (!format) echec("Le format est obligatoire.");
  if (!genreSlug) echec("Le genre principal est obligatoire.");
  if (postures.length === 0) echec("Indiquez s'il s'agit d'une fiction ou d'un documentaire.");
  if (techniques.length === 0) echec("Indiquez la technique : prise de vues réelles, animation, contenu IA ou médias mixtes.");
  if (!FORMATS.includes(format)) echec("Format de projet invalide.");
  if (budgetRange && !VALEURS_BUDGET.includes(budgetRange)) echec("Budget estimé invalide.");
  if (targetAudience && !VALEURS_AUDIENCE.includes(targetAudience)) echec("Audience ciblée invalide.");

  const { error } = await supabase
    .from("projects")
    .update({
      title,
      tagline: tagline || null,
      // Dès que l'auteur change la tagline proposée par WeFilmGood, elle est la sienne.
      ...(tagline !== (projet.tagline ?? "").trim() ? { tagline_proposee: false } : {}),
      logline: logline || null,
      synopsis: synopsis || null,
      format: format || null,
      genre_slug: genreSlug || null,
      postures,
      techniques,
      // Pas de budget ni d'audience pour un court métrage (27/09).
      budget_range: format === "court_metrage" ? null : budgetRange || null,
      target_audience: format === "court_metrage" ? null : targetAudience || null,
      has_awards: hasAwards,
      awards_detail: awardsDetail,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) echec(error.message);

  // Les sous-genres (04/11) : la base ne garde que ceux de la famille, trois au plus.
  const sousGenres = formData.getAll("sous_genres").map(String).slice(0, 3);
  await supabase.rpc("poser_sous_genres", { p_projet: id, p_slugs: sousGenres });


  revalidatePath(`/projet/${id}`);
  redirect(`/projet/${id}?enregistre=1`);
}
