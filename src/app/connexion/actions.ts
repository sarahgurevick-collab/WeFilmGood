"use server";

import { redirect } from "next/navigation";
import { adresseConnue, cheminSur, envoyerLienDeConnexion, rempliParUnRobot } from "@/lib/lien-magique";

/**
 * Entrée unique (05/11/2026, Sarah, comme chez Vimeo) : on ne demande que
 * l'adresse email. Déjà un compte → le lien de connexion part tout de suite.
 * Pas encore de compte → second écran, avec prénom et nom (signUp).
 */
export async function continuer(formData: FormData) {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const next = cheminSur(formData.get("next") as string);

  if (!email) {
    redirect(
      `/connexion?erreur=${encodeURIComponent("Indiquez votre adresse email.")}&next=${encodeURIComponent(next)}`,
    );
  }

  // Robot : l'écran habituel, rien d'envoyé.
  if (rempliParUnRobot(formData)) {
    console.warn("Connexion : formulaire rempli par un robot, ignoré");
    redirect(`/connexion?envoye=${encodeURIComponent(email)}`);
  }

  if (await adresseConnue(email)) {
    await envoyerLienDeConnexion(email, next);
    redirect(`/connexion?envoye=${encodeURIComponent(email)}`);
  }

  redirect(`/connexion?${new URLSearchParams({ nouveau: email, next }).toString()}`);
}
