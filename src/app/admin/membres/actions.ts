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
