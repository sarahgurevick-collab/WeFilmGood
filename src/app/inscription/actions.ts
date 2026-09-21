"use server";

import { redirect } from "next/navigation";
import { cheminSur, envoyerLienDInscription } from "@/lib/lien-magique";

/**
 * Étape 1 : prénom, nom, email — rien d'autre. Le reste du profil se
 * complète après l'activation du compte, bloc par bloc, depuis /profil.
 */
export async function signUp(formData: FormData) {
  const firstName = (formData.get("first_name") as string)?.trim();
  const lastName = (formData.get("last_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const next = cheminSur(formData.get("next") as string);

  const params = (extra: Record<string, string>) =>
    new URLSearchParams({ next, ...extra }).toString();

  if (!firstName || !lastName || !email) {
    redirect(`/inscription?${params({ erreur: "Tous les champs sont obligatoires." })}`);
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
    redirect(`/inscription?${params({ erreur: resultat.erreur })}`);
  }

  redirect(`/inscription?envoye=${encodeURIComponent(email)}`);
}
