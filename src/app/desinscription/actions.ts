"use server";

import { redirect } from "next/navigation";
import { jetonValide } from "@/lib/mailing";
import { createAdminClient } from "@/lib/supabase/admin";

/** Le clic sur « Ne plus recevoir ces emails », confirmé sur la page. */
export async function seDesinscrire(formData: FormData) {
  const p = String(formData.get("p") ?? "");
  const j = String(formData.get("j") ?? "");
  const admin = createAdminClient();
  if (!admin || !jetonValide(p, j)) redirect("/desinscription");
  await admin.from("mailing_desinscriptions").upsert({ profile_id: p, source: "lien" }, { onConflict: "profile_id", ignoreDuplicates: true });
  redirect("/desinscription?fait=1");
}
