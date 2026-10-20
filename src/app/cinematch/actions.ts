"use server";

import { redirect } from "next/navigation";
import {
  MIN_REPONSES,
  PLAFOND_TEXTE_VISITEUR,
  garderBrouillon,
  lireBrouillon,
  reponsesDuFormulaire,
} from "@/lib/cinematch";
import { envoyerLienDInscription, rempliParUnRobot } from "@/lib/lien-magique";
import { createClient } from "@/lib/supabase/server";

/**
 * Étape 1 d'un visiteur sans compte : il a répondu aux questions. Rien n'est
 * écrit dans la base : les réponses attendent dans un cookie, on lui montre
 * le pourcentage de son meilleur match, puis on lui demande son adresse email.
 */
export async function apercuCineMatch(formData: FormData) {
  const supabase = await createClient();
  const { data: questions } = await supabase.from("personality_questions").select("key");
  const cles = (questions ?? []).map((q) => q.key as string);

  const reponses = reponsesDuFormulaire(formData, cles, PLAFOND_TEXTE_VISITEUR);
  if (Object.keys(reponses).length < MIN_REPONSES) redirect("/cinematch?erreur=peu");

  await garderBrouillon(reponses);
  redirect("/cinematch/resultat");
}

/**
 * Étape 2 : l'adresse email. On crée un profil réduit à cette adresse (la
 * catégorie « cinephile », affichée Greenlighter) et on envoie le lien qui
 * l'active. Les réponses voyagent dans les métadonnées du compte : elles sont
 * posées sur le profil quand la personne arrive par le lien (voir la page).
 *
 * Même écran dans tous les cas (robot, plafond atteint, adresse déjà connue)
 * pour ne renseigner personne sur les comptes existants.
 */
export async function demanderLeMatch(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  if (!email) redirect("/cinematch/resultat?metier=non&erreur=email");

  if (rempliParUnRobot(formData)) {
    console.warn("CinéMatch : formulaire rempli par un robot, ignoré");
    redirect(`/cinematch/resultat?envoye=${encodeURIComponent(email)}`);
  }

  const reponses = await lireBrouillon();
  if (!reponses) redirect("/cinematch");

  const resultat = await envoyerLienDInscription(
    email,
    "",
    { category: "cinephile", reponses_cinematch: JSON.stringify(reponses) },
    "/cinematch?bienvenue=1",
  );
  if (!resultat.ok) redirect("/cinematch/resultat?metier=non&erreur=email");

  redirect(`/cinematch/resultat?envoye=${encodeURIComponent(email)}`);
}

/**
 * Étape 2 pour une personne « du métier » : l'inscription habituelle
 * (prénom, nom, email). Sa catégorie se choisit ensuite dans son profil ;
 * ses réponses arrivent comme pour un Greenlighter, par le lien reçu.
 */
export async function creerProfilMetier(formData: FormData) {
  const prenom = (formData.get("first_name") as string | null)?.trim();
  const nom = (formData.get("last_name") as string | null)?.trim();
  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  if (!prenom || !nom || !email) redirect("/cinematch/resultat?metier=oui&erreur=champs");

  if (rempliParUnRobot(formData)) {
    console.warn("CinéMatch : formulaire rempli par un robot, ignoré");
    redirect(`/cinematch/resultat?envoye=${encodeURIComponent(email)}`);
  }

  const reponses = await lireBrouillon();
  if (!reponses) redirect("/cinematch");

  const resultat = await envoyerLienDInscription(
    email,
    `${prenom} ${nom}`,
    { first_name: prenom, last_name: nom, reponses_cinematch: JSON.stringify(reponses) },
    "/cinematch?bienvenue=1",
  );
  if (!resultat.ok) redirect("/cinematch/resultat?metier=oui&erreur=email");

  redirect(`/cinematch/resultat?envoye=${encodeURIComponent(email)}`);
}
