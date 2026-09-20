"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    redirect("/");
  }
  return supabase;
}

const PLAN_PAR_CATEGORIE: Record<string, string> = {
  auteur: "adhesion_auteur_50",
  producteur: "adhesion_pt_50",
  talent: "adhesion_pt_50",
};

/** Active l'adhésion d'un profil : met à jour la plus récente si elle existe, sinon en crée une. */
export async function activerAdhesion(formData: FormData) {
  const supabase = await requireAdmin();
  const profileId = formData.get("profile_id") as string;

  const { data: profile } = await supabase
    .from("profiles")
    .select("category")
    .eq("id", profileId)
    .maybeSingle<{ category: string | null }>();

  const { data: derniere } = await supabase
    .from("memberships")
    .select("id")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (derniere) {
    await supabase
      .from("memberships")
      .update({ status: "active", started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", derniere.id);
  } else {
    await supabase.from("memberships").insert({
      profile_id: profileId,
      plan_slug: PLAN_PAR_CATEGORIE[profile?.category ?? ""] ?? "adhesion_auteur_50",
      status: "active",
      started_at: new Date().toISOString(),
    });
  }

  revalidatePath("/admin/adhesions");
}

export async function expirerAdhesion(formData: FormData) {
  const supabase = await requireAdmin();
  const membershipId = formData.get("membership_id") as string;

  await supabase
    .from("memberships")
    .update({ status: "expiree", updated_at: new Date().toISOString() })
    .eq("id", membershipId);

  revalidatePath("/admin/adhesions");
}
