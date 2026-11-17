"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prevenirLecteurMission } from "@/lib/email-mission-proposee";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    redirect("/");
  }
  return supabase;
}

export type EtatAttribution = { message: string; erreur?: boolean } | null;

/**
 * « Assigner » : propose le projet au lecteur choisi. Un second clic sur le
 * même lecteur ne refait rien (17/11) : ni doublon de proposition, ni
 * second email. Le retour s'affiche sur la ligne.
 */
export async function attribuerLecteur(_etat: EtatAttribution, formData: FormData): Promise<EtatAttribution> {
  const supabase = await requireAdmin();

  const projectId = formData.get("project_id") as string;
  const readerId = formData.get("reader_id") as string;
  if (!projectId || !readerId) return { message: "Choisissez d'abord un lecteur.", erreur: true };

  const { data: lecteur } = await supabase.from("profiles").select("full_name").eq("id", readerId).maybeSingle<{ full_name: string | null }>();
  const nom = lecteur?.full_name ?? "ce lecteur";

  const { data: enCours } = await supabase
    .from("reading_assignments")
    .select("reader_id")
    .eq("project_id", projectId)
    .in("status", ["proposee", "en_cours"])
    .limit(1)
    .maybeSingle<{ reader_id: string }>();
  if (enCours?.reader_id === readerId) return { message: `Déjà proposé à ${nom}.` };

  // La fonction clôt l'assignation en cours, en crée une nouvelle et
  // bascule le projet en « en_lecture ».
  const { error } = await supabase.rpc("admin_reassign_reader", {
    p_project_id: projectId,
    p_reader_id: readerId,
  });
  if (error) return { message: "L'assignation a échoué. Réessayez.", erreur: true };

  await prevenirLecteurMission(readerId, projectId);

  revalidatePath("/admin/projets-en-attente");
  revalidatePath("/admin/fiches-a-valider");
  return { message: `Proposé à ${nom}.` };
}

/** Grise la ligne correspondante chez le lecteur, une fois sa facture réglée. */
export async function markReportPaid(formData: FormData) {
  const supabase = await requireAdmin();

  const reportId = formData.get("report_id") as string;

  await supabase
    .from("reading_reports")
    .update({ payment_status: "payee", paid_at: new Date().toISOString() })
    .eq("id", reportId);

  revalidatePath("/admin/projets-en-attente");
  revalidatePath("/admin/fiches-a-valider");
}
