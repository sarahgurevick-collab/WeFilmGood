"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function rateReport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const reportId = formData.get("report_id") as string;
  const projectId = formData.get("project_id") as string;
  const stars = Number(formData.get("stars"));

  if (!user) {
    redirect(`/connexion?next=/projet/${projectId}/fiche-lecture`);
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 4) {
    redirect(`/projet/${projectId}/fiche-lecture`);
  }

  await supabase.from("reading_report_ratings").insert({
    reading_report_id: reportId,
    rated_by: user.id,
    stars,
  });

  revalidatePath(`/projet/${projectId}/fiche-lecture`);
  // Depuis le bandeau « Notez votre fiche de lecture » (04/11) : retour à la page d'où l'on vient.
  const retour = formData.get("retour");
  if (typeof retour === "string" && retour.startsWith("/") && !retour.startsWith("//")) {
    revalidatePath(retour);
    redirect(retour);
  }
}

/**
 * L'auteur note une ancienne fiche (WFG 1) jamais notée, s'il le souhaite ;
 * aucun rappel pour ces fiches (24/11, Sarah, migration 0328).
 */
export async function rateLegacyReport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const projectId = formData.get("project_id") as string;
  const legacyId = Number(formData.get("legacy_review_id"));
  const stars = Number(formData.get("stars"));
  const retour = `/projet/${projectId}/fiches`;
  if (!user) redirect(`/connexion?next=${retour}`);
  if (Number.isInteger(legacyId) && Number.isInteger(stars) && stars >= 1 && stars <= 4) {
    await supabase.rpc("noter_ancienne_fiche", { p_legacy_review_id: legacyId, p_position: stars });
  }
  revalidatePath(retour);
  redirect(retour);
}
