"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { envoyerEmail } from "@/lib/brevo";

function traduireErreur(message: string) {
  if (message.includes("already registered") || message.includes("already exists")) {
    return "Un compte existe déjà avec cet email.";
  }
  if (message.includes("Password should be")) {
    return "Mot de passe trop faible : au moins 8 caractères.";
  }
  if (message.includes("Unable to validate email")) {
    return "Cette adresse email n'est pas valide.";
  }
  return message;
}

const CATEGORIES = ["auteur", "producteur", "talent"];

export async function signUp(formData: FormData) {
  const fullName = (formData.get("full_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const category = formData.get("category") as string;
  const next = (formData.get("next") as string) || "/";

  const params = (extra: Record<string, string>) =>
    new URLSearchParams({ next, ...extra }).toString();

  if (!fullName || !email || !password || !category) {
    redirect(`/inscription?${params({ erreur: "Tous les champs sont obligatoires." })}`);
  }
  if (!CATEGORIES.includes(category)) {
    redirect(`/inscription?${params({ erreur: "Catégorie de profil invalide." })}`);
  }
  if (password.length < 8) {
    redirect(
      `/inscription?${params({ erreur: "Le mot de passe doit faire au moins 8 caractères." })}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, category },
    },
  });

  if (error) {
    redirect(`/inscription?${params({ erreur: traduireErreur(error.message) })}`);
  }

  await envoyerEmail({
    to: [{ email, name: fullName }],
    subject: "Bienvenue sur WeFilmGood",
    htmlContent: `
      <p>Bonjour ${fullName},</p>
      <p>Votre compte WeFilmGood vient d'être créé. Bienvenue !</p>
    `,
  });

  // Session immédiate si la confirmation par email est désactivée sur le
  // projet Supabase ; sinon l'utilisateur doit d'abord cliquer le lien reçu.
  if (data.session) {
    redirect(next);
  }

  redirect("/inscription?envoye=1");
}
