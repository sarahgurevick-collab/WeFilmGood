"use server";

import { randomUUID } from "node:crypto";
import { ERREURS, adresseValide } from "@/lib/changement-adresse";
import { adresseFictive } from "@/lib/sans-adresse";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Crée le profil d'un auteur sélectionné avant WFG 1 (25/10/2026, Sarah).
 * Comme les profils en attente des équipes : un compte de connexion, adresse
 * confirmée, AUCUN email envoyé ; l'auteur se connectera à l'ouverture de
 * WFG 2 avec cette adresse et retrouvera son profil. Sans adresse, le compte
 * porte une adresse fictive (src/lib/sans-adresse.ts), que Sarah remplacera
 * depuis l'écran des membres. Catégorie auteur, métier scénariste ; le
 * téléphone va dans les coordonnées réservées à l'équipe.
 */
export async function creerProfilAuteur(champs: {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
}): Promise<{ id: string } | { erreur: string }> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) return { erreur: "Réservé à l'administration." };
  const admin = createAdminClient();
  if (!admin) return { erreur: ERREURS.indisponible };

  const prenom = champs.prenom.trim();
  const nom = champs.nom.trim();
  const email = champs.email.trim().toLowerCase();
  const telephone = champs.telephone.trim();
  if (!prenom && !nom) return { erreur: ERREURS.indisponible };
  if (email) {
    if (!adresseValide(email)) return { erreur: ERREURS.invalide };
    const { data: prise } = await admin.rpc("adresse_deja_utilisee", { p_email: email });
    if (prise === true) return { erreur: ERREURS.dejaUtilisee };
  }

  const id = randomUUID();
  const { error } = await admin.auth.admin.createUser({
    id,
    email: email || adresseFictive(id),
    email_confirm: true,
    user_metadata: {
      imported_from: "selection_mds",
      first_name: prenom,
      last_name: nom,
      category: "auteur",
    },
  });
  if (error) {
    if (error.code === "email_exists" || /already|exists/i.test(error.message)) return { erreur: ERREURS.dejaUtilisee };
    console.error("Profil d'auteur sélectionné : échec", error.message);
    return { erreur: ERREURS.indisponible };
  }

  // Le déclencheur de création de compte a fait le profil (prénom, nom,
  // catégorie). On ajoute le métier et les coordonnées.
  await admin
    .from("profile_roles")
    .upsert({ profile_id: id, role_slug: "scenariste" }, { onConflict: "profile_id,role_slug", ignoreDuplicates: true });
  if (email || telephone) {
    await admin.from("profile_contact_info").upsert(
      { profile_id: id, email: email || null, phone: telephone || null, updated_at: new Date().toISOString() },
      { onConflict: "profile_id" },
    );
  }
  return { id };
}
