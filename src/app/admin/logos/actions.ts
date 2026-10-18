"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Les logos de société proposés aux producteurs sans photo (18/10/2026).
 * Valider pose le logo comme photo du producteur, seulement s'il n'en a
 * toujours pas ; écarter le met de côté ; retirer enlève un logo validé,
 * sans jamais toucher une photo que le producteur aurait mise lui-même.
 */
async function service() {
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("is_admin");
  return admin === true ? createAdminClient() : null;
}

export async function validerLogo(formData: FormData) {
  const a = await service();
  if (!a) return;
  const id = formData.get("profile_id") as string;
  const { data: l } = await a.from("logos_producteurs").select("url_logo").eq("profile_id", id).maybeSingle();
  if (!l?.url_logo) return;
  await a.from("profiles").update({ avatar_url: l.url_logo }).eq("id", id).is("avatar_url", null);
  await a.from("logos_producteurs").update({ statut: "valide", traite_le: new Date().toISOString() }).eq("profile_id", id);
  revalidatePath("/admin/logos");
}

export async function ecarterLogo(formData: FormData) {
  const a = await service();
  if (!a) return;
  const id = formData.get("profile_id") as string;
  await a.from("logos_producteurs").update({ statut: "ecarte", traite_le: new Date().toISOString() }).eq("profile_id", id);
  revalidatePath("/admin/logos");
}

export async function retirerLogo(formData: FormData) {
  const a = await service();
  if (!a) return;
  const id = formData.get("profile_id") as string;
  const { data: l } = await a.from("logos_producteurs").select("url_logo").eq("profile_id", id).maybeSingle();
  if (l?.url_logo) await a.from("profiles").update({ avatar_url: null }).eq("id", id).eq("avatar_url", l.url_logo);
  await a.from("logos_producteurs").update({ statut: "ecarte", traite_le: new Date().toISOString() }).eq("profile_id", id);
  revalidatePath("/admin/logos");
}
