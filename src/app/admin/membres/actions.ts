"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const TOUS = ["long_metrage", "court_metrage", "serie", "immersif_360_vr"];

/** Les formats qu'un lecteur peut lire (administration seule). */
export async function choisirFormatsLecteur(formData: FormData) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return;
  const admin = createAdminClient();
  if (!admin) return;

  const profileId = formData.get("profile_id") as string;
  const coches = formData.getAll("format").map(String).filter((f) => TOUS.includes(f));
  const formats = coches.length === TOUS.length ? null : coches;

  await admin
    .from("reader_profiles")
    .upsert({ profile_id: profileId, formats, updated_at: new Date().toISOString() });
  revalidatePath("/admin/membres");
  revalidatePath("/admin/projets-en-attente");
}

/**
 * L'adhésion d'un membre, choisie dans le tableau des membres (27/09,
 * comme la colonne Adhésion de WFG 1) : aucune, 5 € (un mois), 50 € ou 500 €
 * (un an, comme celle payée en ligne).
 */
export async function changerAdhesion(formData: FormData) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return;

  const profileId = formData.get("profile_id") as string;
  const plan = (formData.get("plan_slug") as string) || "";
  const maintenant = new Date();

  // On clôt d'abord l'adhésion en cours, s'il y en a une.
  await supabase
    .from("memberships")
    .update({ status: "expiree", updated_at: maintenant.toISOString() })
    .eq("profile_id", profileId)
    .eq("status", "active");

  if (plan === "palier_5" || plan === "palier_50" || plan === "palier_500") {
    // 5 € : un mois ; 50 € et 500 € : un an.
    const fin = new Date(maintenant);
    if (plan === "palier_5") fin.setMonth(fin.getMonth() + 1);
    else fin.setFullYear(fin.getFullYear() + 1);
    const { error } = await supabase.from("memberships").insert({
      profile_id: profileId,
      plan_slug: plan,
      status: "active",
      payment_provider: "admin",
      started_at: maintenant.toISOString(),
      expires_at: fin.toISOString(),
    });
    if (error) console.error("Adhésion non enregistrée :", error.message);
  }
  revalidatePath("/admin/membres");
}

/**
 * L'adresse email d'un membre, changée directement par l'administration
 * (09/10, Sarah) : pour le talent qui l'a demandé par téléphone, ou qui n'a
 * plus accès à son ancienne boîte. Renvoie un message d'erreur, ou rien.
 */
export async function changerAdresseMembre(profileId: string, nouvelleAdresse: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return "Réservé à l'administration.";

  const email = nouvelleAdresse.trim().toLowerCase();
  const { appliquerNouvelleAdresse, verifierNouvelleAdresse } = await import("@/lib/changement-adresse");
  const erreur = (await verifierNouvelleAdresse(email, null)) ?? (await appliquerNouvelleAdresse(profileId, email));
  if (erreur) return erreur;
  revalidatePath("/admin/membres");
  return null;
}

const CATEGORIES_ADMIN = ["auteur", "producteur", "talent", "cinephile"];

/** La catégorie d'un membre, changée depuis l'écran des membres (10/10, Sarah). */
export async function changerCategorie(formData: FormData) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return;

  const profileId = formData.get("profile_id") as string;
  const category = (formData.get("category") as string) || "";
  if (!profileId || !CATEGORIES_ADMIN.includes(category)) return;

  const { error } = await supabase.rpc("admin_changer_categorie", { p_profile: profileId, p_category: category });
  if (error) console.error("Changement de catégorie refusé :", error.message);
  revalidatePath("/admin/membres");
}

/**
 * Supprimer un membre (18/10/2026, Sarah). Réservé aux profils vides : sans
 * projet, sans message, sans adhésion, sans fiche de lecture ni place dans
 * une équipe. Sinon on refuse en disant pourquoi : effacer un vrai membre
 * ferait disparaître ses projets ou ses échanges. La suppression est notée
 * dans membres_supprimes, que la réimportation de WFG 1 consulte, et le
 * profil est d'abord sauvegardé dans la même ligne (motif).
 * Renvoie un message d'erreur, ou rien.
 */
export async function supprimerMembre(profileId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return "Réservé à l'administration.";
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id === profileId) return "Vous ne pouvez pas supprimer votre propre compte.";

  const admin = createAdminClient();
  if (!admin) return "Suppression momentanément indisponible.";

  const compter = async (table: string, colonne: string) =>
    (await admin.from(table).select("*", { count: "exact", head: true }).eq(colonne, profileId)).count ?? 0;
  const [projets, envoyes, recus, adhesions, fiches, equipes, admins] = await Promise.all([
    compter("projects", "owner_id"),
    compter("project_messages", "sender_id"),
    compter("project_messages", "recipient_id"),
    compter("memberships", "profile_id"),
    compter("reading_reports", "reader_id"),
    compter("project_co_authors", "profile_id"),
    compter("admins", "profile_id"),
  ]);
  if (admins > 0) return "C'est un compte administrateur : il ne se supprime pas d'ici.";
  const raisons = [
    projets && `${projets} projet${projets > 1 ? "s" : ""}`,
    envoyes + recus && `${envoyes + recus} message${envoyes + recus > 1 ? "s" : ""}`,
    adhesions && "une adhésion",
    fiches && `${fiches} fiche${fiches > 1 ? "s" : ""} de lecture`,
    equipes && "une place dans une équipe",
  ].filter(Boolean);
  if (raisons.length) return `Ce membre a ${raisons.join(", ")} : il ne peut pas être supprimé d'ici.`;

  const { data: profil } = await admin
    .from("profiles")
    .select("full_name, legacy_user_id")
    .eq("id", profileId)
    .maybeSingle<{ full_name: string | null; legacy_user_id: number | null }>();
  const { data: compte } = await admin.auth.admin.getUserById(profileId);
  const email = compte.user?.email ?? "";

  await admin.from("membres_supprimes").insert({
    legacy_user_id: profil?.legacy_user_id ?? null,
    email,
    nom: profil?.full_name ?? null,
    motif: "Supprimé depuis l'écran des membres",
    supprime_par: user.id,
  });
  await admin.from("admin_impersonations").delete().eq("target_id", profileId);
  if (profil?.legacy_user_id) await admin.from("legacy_profiles").delete().eq("legacy_user_id", profil.legacy_user_id);

  const { error: errProfil } = await admin.from("profiles").delete().eq("id", profileId);
  if (errProfil) {
    console.error("Suppression du membre refusée :", errProfil.message);
    return "Le profil est encore relié à d'autres éléments du site : demandez à Claude.";
  }
  const { error: errCompte } = await admin.auth.admin.deleteUser(profileId);
  if (errCompte) console.error("Compte de connexion non supprimé :", errCompte.message);

  revalidatePath("/admin/membres");
  return null;
}

/**
 * Déverrouille les réponses CinéMatch d'un membre (20/10/2026) : sa prochaine
 * sauvegarde pourra modifier celles déjà données, puis le verrou se remet.
 * Renvoie un message d'erreur, ou rien.
 */
export async function deverrouillerCineMatch(profileId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return "Réservé à l'administration.";

  const admin = createAdminClient();
  if (!admin) return "Déverrouillage momentanément indisponible.";

  const { error } = await admin
    .from("profiles")
    .update({ personality_unlocked_at: new Date().toISOString() })
    .eq("id", profileId);
  if (error) {
    console.error("Déverrouillage CinéMatch refusé :", error.message);
    return "Le déverrouillage a échoué.";
  }
  revalidatePath("/admin/membres");
  return null;
}
