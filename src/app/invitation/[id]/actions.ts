"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function repondre(formData: FormData) {
  const id = (formData.get("id") as string) ?? "";
  const accepte = formData.get("reponse") === "accepter";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(`/invitation/${id}`)}`);

  const { data: projet } = await supabase.rpc("repondre_invitation", { p_id: id, p_accepte: accepte });
  if (projet) revalidatePath(`/projet/${projet}`);
  redirect(accepte ? "/profil" : "/");
}
