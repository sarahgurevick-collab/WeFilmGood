"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { envoyerLienDInscription, rempliParUnRobot } from "@/lib/lien-magique";

export async function signUpReader(formData: FormData) {
  const fullName = (formData.get("full_name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const code = (formData.get("code") as string)?.trim();

  const fail = (erreur: string) => {
    const params = new URLSearchParams({ erreur, code: code ?? "" });
    redirect(`/lecteur/inscription?${params.toString()}`);
  };

  if (!fullName || !email || !code) {
    fail("Tous les champs sont obligatoires.");
    return;
  }

  // Robot : même écran que d'habitude, mais rien n'est créé ni envoyé.
  if (rempliParUnRobot(formData)) {
    console.warn("Inscription lecteur : formulaire rempli par un robot, ignoré");
    redirect("/lecteur/inscription?envoye=1");
  }

  const supabase = await createClient();

  // Le code n'est jamais lisible directement : cette fonction se contente
  // de répondre oui/non, sans exposer la table des codes.
  const { data: isValid } = await supabase.rpc("check_reader_code", { p_code: code });
  if (!isValid) {
    fail("Code invalide ou expiré.");
    return;
  }

  const resultat = await envoyerLienDInscription(email, fullName, { reader_code: code }, "/lecteur");
  if (!resultat.ok) {
    fail(resultat.erreur);
    return;
  }

  redirect("/lecteur/inscription?envoye=1");
}
