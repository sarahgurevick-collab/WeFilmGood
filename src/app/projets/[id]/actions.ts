"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Crée le lien de partage, ou le révoque — ce qui referme l'accès aux destinataires précédents. */
export async function setShareLink(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projectId = formData.get("project_id") as string;
  const actif = formData.get("actif") === "1";

  if (!user) {
    redirect(`/connexion?next=/projets/${projectId}`);
  }

  await supabase.rpc("set_project_share_token", {
    p_project_id: projectId,
    p_actif: actif,
  });

  revalidatePath(`/projets/${projectId}`);
}

/** Écrit à l'auteur d'un projet. Le message part toujours ; l'auteur ne pourra le lire que si son adhésion est active. */
export async function contacterAuteur(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projectId = formData.get("project_id") as string;
  const recipientId = formData.get("recipient_id") as string;
  const body = (formData.get("body") as string)?.trim();

  if (!user) {
    redirect(`/connexion?next=/projets/${projectId}`);
  }
  if (!body) {
    redirect(`/projets/${projectId}?message=vide`);
  }

  await supabase.from("project_messages").insert({
    project_id: projectId,
    sender_id: user.id,
    recipient_id: recipientId,
    body,
  });

  revalidatePath(`/projets/${projectId}`);
  redirect(`/projets/${projectId}?message=envoye`);
}
