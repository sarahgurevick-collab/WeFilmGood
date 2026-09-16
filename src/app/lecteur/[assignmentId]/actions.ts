"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ficheEstVide, sanitizeFiche } from "@/lib/sanitize";

/**
 * Enregistre le brouillon en cours de frappe. Silencieux : une
 * sauvegarde qui échoue ne doit jamais interrompre quelqu'un en train
 * d'écrire.
 */
export async function saveDraft(assignmentId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { error } = await supabase
    .from("reading_assignments")
    .update({
      draft_content: sanitizeFiche(content),
      draft_saved_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("reader_id", user.id);

  return error ? null : new Date().toISOString();
}

export async function submitReadingReport(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const assignmentId = formData.get("assignment_id") as string;
  const projectId = formData.get("project_id") as string;
  const content = sanitizeFiche((formData.get("content") as string) ?? "");
  const score = Number(formData.get("score"));
  const motivation = (formData.get("label_motivation") as string)?.trim() || null;

  if (!user) {
    redirect(`/connexion?next=/lecteur/${assignmentId}`);
  }

  const fail = (message: string) =>
    redirect(`/lecteur/${assignmentId}?erreur=${encodeURIComponent(message)}`);

  if (ficheEstVide(content)) {
    fail("L'analyse ne peut pas être vide.");
  }
  if (!Number.isInteger(score) || score < 0 || score > 200) {
    fail("La note doit être comprise entre 0 et 200.");
  }
  if (score > 150 && !motivation) {
    fail("Une note au-delà de 150 labellise le projet : dites en quelques lignes pourquoi.");
  }

  const { error } = await supabase.from("reading_reports").insert({
    assignment_id: assignmentId,
    project_id: projectId,
    reader_id: user.id,
    content,
    score,
    label_motivation: motivation,
  });

  if (error) {
    fail(error.message);
  }

  await supabase
    .from("reading_assignments")
    .update({ status: "rendue", responded_at: new Date().toISOString() })
    .eq("id", assignmentId)
    .eq("reader_id", user.id);

  await supabase
    .from("reader_profiles")
    .upsert({ profile_id: user.id, availability_status: "vert", updated_at: new Date().toISOString() });

  redirect("/lecteur/mes-fiches");
}
