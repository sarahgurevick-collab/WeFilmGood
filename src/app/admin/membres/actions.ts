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
 * comme la colonne Adhésion de WFG 1) : aucune, 50 € ou 500 €. Une
 * adhésion offerte ou réglée autrement dure un an, comme celle payée en
 * ligne.
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

  if (plan === "palier_50" || plan === "palier_500") {
    const dansUnAn = new Date(maintenant);
    dansUnAn.setFullYear(dansUnAn.getFullYear() + 1);
    await supabase.from("memberships").insert({
      profile_id: profileId,
      plan_slug: plan,
      status: "active",
      payment_provider: "admin",
      started_at: maintenant.toISOString(),
      expires_at: dansUnAn.toISOString(),
    });
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
