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

export async function validateReport(formData: FormData) {
  const supabase = await requireAdmin();

  const reportId = formData.get("report_id") as string;
  const decision = formData.get("decision") as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Le passage à « validee_admin » déclenche en base la labellisation du
  // projet et la libération du lecteur.
  await supabase
    .from("reading_reports")
    .update({
      status: decision === "valider" ? "validee_admin" : "rejetee_admin",
      admin_validated_by: user?.id ?? null,
      admin_validated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  revalidatePath("/admin/projets-en-attente");
}
