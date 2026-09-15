"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const VOYANTS = ["vert", "orange", "rouge"];

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
  if (!VOYANTS.includes(status)) {
    redirect("/lecteur");
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
