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
    // Le lien ne sert qu'une fois. Mais si ce même lien vient d'ouvrir
    // une session dans ce navigateur — double clic, retour arrière,
    // second onglet —, la personne est bien connectée : on l'emmène
    // simplement où elle allait, sans lui reprocher un lien « déjà
    // servi ». Une session plus ancienne, elle, ne prouve rien : le lien
    // pouvait viser un autre compte.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const connexionRecente =
      user?.last_sign_in_at && Date.now() - new Date(user.last_sign_in_at).getTime() < 120_000;
    if (!connexionRecente) {
      redirect(
        "/connexion?erreur=" +
          encodeURIComponent("Ce lien a déjà servi ou a expiré. Demandez-en un nouveau ci-dessous."),
      );
    }
  }

  // Une administratrice arrive pour travailler : sa première page est
  // les fiches à valider, pas la vitrine. On ne détourne que le
  // cas par défaut : si elle cliquait sur un lien précis, il l'emporte.
  if (next === "/") {
    const { data: admin } = await supabase.rpc("is_admin");
    if (admin === true) redirect("/admin/fiches-a-valider");
  }

  redirect(next);
}
