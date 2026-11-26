"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { prevenirAuteurFichePrete } from "@/lib/email-fiche-prete";
import { ficheEstVide, retirerVertCorrection, sanitizeFiche } from "@/lib/sanitize";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    redirect("/");
  }
  return supabase;
}


/** Le mot pour le label : facultatif, modifiable, rédigé après la fiche. */
async function poserMotivation(supabase: Awaited<ReturnType<typeof requireAdmin>>, reportId: string, formData: FormData) {
  if (!formData.has("label_motivation")) return;
  const motivation = ((formData.get("label_motivation") as string) ?? "").trim() || null;
  await supabase.from("reading_reports").update({ label_motivation: motivation }).eq("id", reportId);
}

export async function publishReport(formData: FormData) {
  const supabase = await requireAdmin();

  const reportId = formData.get("report_id") as string;
  // Le vert des corrections d'orthographe ne sert qu'à la relecture : il part à la publication.
  const content = retirerVertCorrection(sanitizeFiche((formData.get("content") as string) ?? ""));
  const score = Number(formData.get("score"));

  if (ficheEstVide(content) || !Number.isInteger(score) || score < 0 || score > 200) {
    redirect(`/admin/fiches/${reportId}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Changement de lecteur (27/09) : la fiche et sa mission passent au
  // lecteur choisi, qui sera payé.
  const nouveauLecteur = (formData.get("reader_id") as string) || null;
  if (nouveauLecteur) {
    const { data: fiche } = await supabase
      .from("reading_reports")
      .select("reader_id, assignment_id")
      .eq("id", reportId)
      .maybeSingle<{ reader_id: string; assignment_id: string }>();
    if (fiche && fiche.reader_id !== nouveauLecteur) {
      await supabase.from("reading_reports").update({ reader_id: nouveauLecteur }).eq("id", reportId);
      await supabase.from("reading_assignments").update({ reader_id: nouveauLecteur }).eq("id", fiche.assignment_id);
    }
  }

  // Première publication seulement : une republication ne re-prévient pas l'auteur.
  const { data: dejaPubliee } = await supabase
    .from("reading_report_publications")
    .select("reading_report_id")
    .eq("reading_report_id", reportId)
    .maybeSingle();

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

  await poserMotivation(supabase, reportId, formData);

  if (!dejaPubliee) {
    const { data: fiche } = await supabase.from("reading_reports").select("project_id").eq("id", reportId).maybeSingle<{ project_id: string }>();
    if (fiche) await prevenirAuteurFichePrete(fiche.project_id);
  }

  // Publiée : le brouillon n'a plus lieu d'être.
  await supabase.from("fiches_brouillons_admin").delete().eq("reading_report_id", reportId);

  revalidatePath("/admin/fiches-a-valider");
  redirect("/admin/fiches-a-valider");
}

/**
 * « Enregistrer » (16/11, Sarah) : garde les corrections, la note et le
 * lecteur choisi, sans rien publier ni changer pour le lecteur ou l'auteur.
 */
export async function enregistrerBrouillon(formData: FormData) {
  const supabase = await requireAdmin();
  const reportId = formData.get("report_id") as string;
  const content = sanitizeFiche((formData.get("content") as string) ?? "");
  const brut = formData.get("score");
  const score = brut === null || brut === "" ? null : Number(brut);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await poserMotivation(supabase, reportId, formData);

  const { error } = await supabase.from("fiches_brouillons_admin").upsert({
    reading_report_id: reportId,
    content,
    score: score !== null && Number.isInteger(score) && score >= 0 && score <= 200 ? score : null,
    reader_id: (formData.get("reader_id") as string) || null,
    enregistre_par: user?.id ?? null,
    enregistre_le: new Date().toISOString(),
  });

  // Un échec ne doit jamais passer pour un « Enregistré ».
  if (error) {
    console.error("Enregistrement de la fiche refusé :", error.message);
    redirect(`/admin/fiches/${reportId}?enregistre=0`);
  }
  redirect(`/admin/fiches/${reportId}?enregistre=1`);
}
