"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    redirect("/");
  }
  return supabase;
}

export async function reassignReader(formData: FormData) {
  const supabase = await requireAdmin();

  const projectId = formData.get("project_id") as string;
  const readerId = formData.get("reader_id") as string;

  if (!projectId || !readerId) {
    redirect("/admin/projets-en-attente");
  }

  // La fonction clôt l'assignation en cours, en crée une nouvelle et
  // bascule le projet en « en_lecture ».
  await supabase.rpc("admin_reassign_reader", {
    p_project_id: projectId,
    p_reader_id: readerId,
  });

  revalidatePath("/admin/projets-en-attente");
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
}
