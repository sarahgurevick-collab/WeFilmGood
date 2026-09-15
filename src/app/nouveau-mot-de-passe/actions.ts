"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;
  const confirm = formData.get("password_confirm") as string;

  const fail = (message: string) =>
    redirect("/nouveau-mot-de-passe?erreur=" + encodeURIComponent(message));

  if (!password || password.length < 8) {
    fail("Le mot de passe doit faire au moins 8 caractères.");
  }
  if (password !== confirm) {
    fail("Les deux mots de passe ne correspondent pas.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    fail(error.message);
  }

  redirect("/menu");
}
