"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Valider une fiche de lecture reprise de WFG 1 (statut 1 : rendue par le
 * lecteur, jamais relue). Sarah relit, corrige le texte au besoin, pose
 * la note avec le curseur, et valide : la fiche passe en « vérifiée »
 * (statut 2), devient visible de l'auteur, et le projet est labellisé
 * si la note dépasse 150 — comme pour une fiche de WFG 2. Le mot pour
 * le label, s'il y en a un, devient l'« Avis WeFilmGood » du projet.
 */
export async function validerFicheAncienne(formData: FormData) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const id = Number(formData.get("legacy_review_id"));
  const content = ((formData.get("content") as string) ?? "").trim();
  const score = Number(formData.get("score"));
  const motivation = ((formData.get("label_motivation") as string) ?? "").trim();

  if (!Number.isInteger(id) || !content || !Number.isInteger(score) || score < 0 || score > 200) {
    redirect(`/admin/fiches/ancienne/${id}`);
  }

  const admin = createAdminClient();
  if (!admin) redirect(`/admin/fiches/ancienne/${id}`);

  const labellise = score > 150;
  const { data: fiche, error } = await admin
    .from("legacy_reading_reports")
    .update({
      content,
      final_mark: score,
      statut: 2,
      ...(labellise && motivation ? { wfg_review: motivation } : {}),
    })
    .eq("legacy_review_id", id)
    .select("project_id")
    .maybeSingle<{ project_id: string }>();
  if (error || !fiche) redirect(`/admin/fiches/ancienne/${id}`);

  await admin
    .from("projects")
    .update({ status: labellise ? "labellise" : "lecture_terminee_non_labellise" })
    .eq("id", fiche.project_id)
    .in("status", ["depose", "en_lecture"]);

  revalidatePath("/admin/fiches-a-valider");
  revalidatePath(`/projet/${fiche.project_id}`);
  redirect("/admin/fiches-a-valider");
}
