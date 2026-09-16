"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * L'orange n'est pas un choix : la plateforme l'allume à l'acceptation
 * d'une lecture. Le lecteur ne pilote que sa disponibilité.
 */
const VOYANTS_CHOISIS = ["vert", "rouge"];

async function requireReader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/lecteur");
  }

  const { data: readerRole } = await supabase
    .from("profile_roles")
    .select("role_slug")
    .eq("profile_id", user.id)
    .eq("role_slug", "lecteur")
    .maybeSingle();

  if (!readerRole) {
    redirect("/");
  }

  return { supabase, user };
}

export async function updateAvailability(formData: FormData) {
  const { supabase, user } = await requireReader();

  const status = formData.get("availability_status") as string;
  if (!VOYANTS_CHOISIS.includes(status)) {
    redirect("/lecteur");
  }

  // Une lecture acceptée verrouille le voyant : on ne se déclare pas
  // indisponible après avoir pris un texte en charge.
  const { data: enCours } = await supabase
    .from("reading_assignments")
    .select("id")
    .eq("reader_id", user.id)
    .eq("status", "en_cours")
    .maybeSingle();

  if (enCours) {
    redirect("/lecteur");
  }

  // Se déclarer indisponible vaut refus des projets encore en attente de
  // réponse : c'est le geste du lecteur qui a oublié de fermer sa porte et
  // découvre qu'on lui a confié un texte.
  if (status === "rouge") {
    await supabase
      .from("reading_assignments")
      .update({ status: "refusee", responded_at: new Date().toISOString() })
      .eq("reader_id", user.id)
      .eq("status", "proposee");
  }

  await supabase
    .from("reader_profiles")
    .upsert({ profile_id: user.id, availability_status: status, updated_at: new Date().toISOString() });

  revalidatePath("/lecteur");
}

export async function respondToAssignment(formData: FormData) {
  const { supabase, user } = await requireReader();

  const assignmentId = formData.get("assignment_id") as string;
  const decision = formData.get("decision") as string;
  const accepte = decision === "accepte";

  await supabase
    .from("reading_assignments")
    .update({
      status: accepte ? "en_cours" : "refusee",
      responded_at: new Date().toISOString(),
    })
    .eq("id", assignmentId)
    .eq("reader_id", user.id);

  // Accepter un projet met le voyant en « travail » ; le refuser ne change
  // rien, le lecteur reste disponible pour un autre texte.
  if (accepte) {
    await supabase
      .from("reader_profiles")
      .upsert({ profile_id: user.id, availability_status: "orange", updated_at: new Date().toISOString() });
  }

  revalidatePath("/lecteur");
}
