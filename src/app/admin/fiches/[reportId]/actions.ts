"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ficheEstVide, sanitizeFiche } from "@/lib/sanitize";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    redirect("/");
  }
  return supabase;
}

export async function publishReport(formData: FormData) {
  const supabase = await requireAdmin();

  const reportId = formData.get("report_id") as string;
  const content = sanitizeFiche((formData.get("content") as string) ?? "");
  const score = Number(formData.get("score"));

  if (ficheEstVide(content) || !Number.isInteger(score) || score < 0 || score > 200) {
    redirect(`/admin/fiches/${reportId}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // La publication déclenche en base la labellisation du projet selon la
  // note publiée, le passage de la fiche en « validée » et la libération
  // du lecteur.
  await supabase.from("reading_report_publications").upsert({
    reading_report_id: reportId,
    content,
    score,
    published_by: user?.id ?? null,
    updated_at: new Date().toISOString(),
  });

  revalidatePath("/admin/projets-en-attente");
  redirect("/admin/projets-en-attente");
}
