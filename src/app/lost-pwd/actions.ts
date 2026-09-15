"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();

  if (!email) {
    redirect("/lost-pwd?erreur=" + encodeURIComponent("Indiquez votre adresse email."));
  }

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${protocol}://${host}/auth/confirm?next=/nouveau-mot-de-passe`,
  });

  // On confirme l'envoi quoi qu'il arrive : répondre différemment selon que
  // l'adresse existe ou non permettrait d'énumérer les comptes du site.
  redirect("/lost-pwd?envoye=1");
}
