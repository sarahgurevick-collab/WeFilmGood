"use server";

import { redirect } from "next/navigation";
import { cheminSur, envoyerLienDInscription, rempliParUnRobot } from "@/lib/lien-magique";

/**
 * Étape 1 : prénom, nom, email — rien d'autre. Le reste du profil se
 * complète après l'activation du compte, bloc par bloc, depuis /profil.
 */
export async function signUp(formData: FormData) {
  const firstName = (formData.get("first_name") as string)?.trim();
  const lastName = (formData.get("last_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const next = cheminSur(formData.get("next") as string);

  // Depuis le 05/11/2026, l'inscription est le second écran de /connexion
  // (entrée unique) : on y revient, avec l'adresse déjà tapée.
  const params = (extra: Record<string, string>) =>
    new URLSearchParams({ next, nouveau: email ?? "", ...extra }).toString();
  const envoye = `/connexion?envoye=${encodeURIComponent(email)}&cree=1`;

  if (!firstName || !lastName || !email) {
    redirect(`/connexion?${params({ erreur: "Tous les champs sont obligatoires." })}`);
  }

  // Robot : même écran que d'habitude, mais rien n'est créé ni envoyé.
  if (rempliParUnRobot(formData)) {
    console.warn("Inscription : formulaire rempli par un robot, ignoré");
    redirect(envoye);
  }

  const fullName = `${firstName} ${lastName}`;

  // Après le clic sur le lien, on atterrit sur le sommaire du profil, sauf
  // si la personne venait d'une page précise.
  const arrivee = next === "/" ? "/profil?bienvenue=1" : next;

  const resultat = await envoyerLienDInscription(
    email,
    fullName,
    { first_name: firstName, last_name: lastName },
    arrivee,
  );
  if (!resultat.ok) {
    redirect(`/connexion?${params({ erreur: resultat.erreur })}`);
  }

  redirect(envoye);
}
