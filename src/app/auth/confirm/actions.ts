"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cheminSur } from "@/lib/lien-magique";
import { createClient } from "@/lib/supabase/server";

export async function confirmerLien(formData: FormData) {
  const tokenHash = formData.get("token_hash") as string;
  const type = formData.get("type") as EmailOtpType;
  const next = cheminSur(formData.get("next") as string);

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    redirect(
      "/connexion?erreur=" +
        encodeURIComponent("Ce lien a déjà servi ou a expiré. Demandez-en un nouveau ci-dessous."),
    );
  }

  // Une administratrice arrive pour travailler : sa première page est
  // l'attribution des lecteurs, pas la vitrine. On ne détourne que le
  // cas par défaut : si elle cliquait sur un lien précis, il l'emporte.
  if (next === "/") {
    const { data: admin } = await supabase.rpc("is_admin");
    if (admin === true) redirect("/admin/projets-en-attente");
  }

  redirect(next);
}
