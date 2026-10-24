"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { estAdmin } from "@/lib/photos-archives";

/** Coche ou décoche une photo : cochée = peut aller en ligne sur le site. */
export async function cocherPhoto(id: string, enLigne: boolean) {
  if (!(await estAdmin())) return { ok: false };
  const a = createAdminClient();
  if (!a) return { ok: false };
  const { error } = await a
    .from("photos_archives")
    .update({ en_ligne: enLigne, coche_le: enLigne ? new Date().toISOString() : null })
    .eq("id", id);
  return { ok: !error };
}
