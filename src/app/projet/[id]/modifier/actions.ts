"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { chargerProjetAModifier } from "../../blocs";
import { deposerScenario } from "../fichiers";
import { AUDIENCES, BUDGETS } from "../../ChampsFiche";

const FORMATS = ["long_metrage", "court_metrage", "serie", "immersif_360_vr"];
const VALEURS_BUDGET = BUDGETS.map((b) => b.value);
const VALEURS_AUDIENCE = AUDIENCES.map((a) => a.value);

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
  const logline = (formData.get("logline") as string)?.trim();
  const synopsis = (formData.get("synopsis") as string)?.trim();
  const format = formData.get("format") as string;
  const genreSlug = (formData.get("genre_slug") as string)?.trim();
  const budgetRange = formData.get("budget_range") as string;
  const targetAudience = formData.get("target_audience") as string;
  const hasAwards = formData.get("has_awards") === "oui";
  const awardsDetail = hasAwards ? (formData.get("awards_detail") as string)?.trim() || null : null;
  const scenario = formData.get("scenario") as File | null;

  if (!title) echec("Le titre est obligatoire.");
  if (format && !FORMATS.includes(format)) echec("Format de projet invalide.");
  if (budgetRange && !VALEURS_BUDGET.includes(budgetRange)) echec("Budget estimé invalide.");
  if (targetAudience && !VALEURS_AUDIENCE.includes(targetAudience)) echec("Audience ciblée invalide.");
  if (scenario && scenario.size > 0 && scenario.type !== "application/pdf") {
    echec("Le scénario doit être un fichier PDF.");
  }

  const { error } = await supabase
    .from("projects")
    .update({
      title,
      logline: logline || null,
      synopsis: synopsis || null,
      format: format || null,
      genre_slug: genreSlug || null,
      budget_range: budgetRange || null,
      target_audience: targetAudience || null,
      has_awards: hasAwards,
      awards_detail: awardsDetail,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) echec(error.message);

  if (scenario && scenario.size > 0) {
    const depose = await deposerScenario(supabase, projet.owner_id, id, scenario);
    if (!depose) {
      echec("La fiche est enregistrée, mais le scénario n'a pas pu l'être. Réessayez, ou écrivez-nous.");
    }
  }

  revalidatePath(`/projet/${id}`);
  redirect(`/projet/${id}?enregistre=1`);
}
