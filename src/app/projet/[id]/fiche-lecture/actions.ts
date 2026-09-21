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
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    redirect(`/projet/${projectId}/fiche-lecture`);
  }

  await supabase.from("reading_report_ratings").insert({
    reading_report_id: reportId,
    rated_by: user.id,
    stars,
  });

  revalidatePath(`/projet/${projectId}/fiche-lecture`);
}
