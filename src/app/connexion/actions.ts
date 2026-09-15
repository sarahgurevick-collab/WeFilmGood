"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function traduireErreur(message: string) {
  if (message.includes("Invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (message.includes("Email not confirmed")) {
    return "Confirme ton email avant de te connecter.";
  }
  return message;
}

export async function signIn(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const next = (formData.get("next") as string) || "/";

  if (!email || !password) {
    redirect(
      `/connexion?erreur=${encodeURIComponent("Email et mot de passe requis.")}&next=${encodeURIComponent(next)}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(
      `/connexion?erreur=${encodeURIComponent(traduireErreur(error.message))}&next=${encodeURIComponent(next)}`,
    );
  }

  redirect(next);
}
