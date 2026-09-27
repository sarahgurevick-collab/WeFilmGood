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
