"use server";

import { redirect } from "next/navigation";
import { cheminSur, envoyerLienDeConnexion } from "@/lib/lien-magique";

export async function signIn(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const next = cheminSur(formData.get("next") as string);

  if (!email) {
    redirect(
      `/connexion?erreur=${encodeURIComponent("Indiquez votre adresse email.")}&next=${encodeURIComponent(next)}`,
    );
  }

  await envoyerLienDeConnexion(email, next);

  // Même réponse que l'adresse soit inscrite ou non : répondre autrement
  // permettrait de deviner qui a un compte sur le site.
  redirect(`/connexion?envoye=${encodeURIComponent(email)}`);
}
