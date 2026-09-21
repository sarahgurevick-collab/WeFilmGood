"use server";

import { redirect } from "next/navigation";
import { cheminSur, envoyerLienDInscription } from "@/lib/lien-magique";

const CATEGORIES = ["auteur", "producteur", "talent"];

export async function signUp(formData: FormData) {
  const fullName = (formData.get("full_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const category = formData.get("category") as string;
  const next = cheminSur(formData.get("next") as string);

  const params = (extra: Record<string, string>) =>
    new URLSearchParams({ next, ...extra }).toString();

  if (!fullName || !email || !category) {
    redirect(`/inscription?${params({ erreur: "Tous les champs sont obligatoires." })}`);
  }
  if (!CATEGORIES.includes(category)) {
    redirect(`/inscription?${params({ erreur: "Catégorie de profil invalide." })}`);
  }

  const resultat = await envoyerLienDInscription(email, fullName, { category }, next);
  if (!resultat.ok) {
    redirect(`/inscription?${params({ erreur: resultat.erreur })}`);
  }

  redirect(`/inscription?envoye=${encodeURIComponent(email)}`);
}
