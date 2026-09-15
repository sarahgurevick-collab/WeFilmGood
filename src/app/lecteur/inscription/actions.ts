"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function traduireErreur(message: string) {
  if (message.includes("already registered") || message.includes("already exists")) {
    return "Un compte existe déjà avec cet email.";
  }
  if (message.includes("Password should be")) {
    return "Mot de passe trop faible : au moins 8 caractères.";
  }
  return message;
}

export async function signUpReader(formData: FormData) {
  const fullName = (formData.get("full_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const code = (formData.get("code") as string)?.trim();

  const fail = (erreur: string) => {
    const params = new URLSearchParams({ erreur, code: code ?? "" });
    redirect(`/lecteur/inscription?${params.toString()}`);
  };

  if (!fullName || !email || !password || !code) {
    fail("Tous les champs sont obligatoires.");
    return;
  }
  if (password.length < 8) {
    fail("Le mot de passe doit faire au moins 8 caractères.");
    return;
  }

  const supabase = await createClient();

  // Le code n'est jamais lisible directement : cette fonction se contente
  // de répondre oui/non, sans exposer la table des codes.
  const { data: isValid } = await supabase.rpc("check_reader_code", { p_code: code });
  if (!isValid) {
    fail("Code invalide ou expiré.");
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, reader_code: code },
    },
  });

  if (error) {
    fail(traduireErreur(error.message));
    return;
  }

  if (data.session) {
    redirect("/");
  }

  redirect("/lecteur/inscription?envoye=1");
}
