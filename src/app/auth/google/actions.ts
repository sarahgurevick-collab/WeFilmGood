"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cheminSur } from "@/lib/lien-magique";
import { createClient } from "@/lib/supabase/server";

/**
 * Part chez Google, qui renvoie ensuite sur /auth/callback. Un seul bouton
 * pour les deux cas : une adresse déjà inscrite retrouve son compte (Supabase
 * relie Google au compte qui porte la même adresse), une nouvelle crée le sien.
 */
export async function continuerAvecGoogle(formData: FormData) {
  const next = cheminSur(formData.get("next") as string);
  const depuis = formData.get("depuis") === "inscription" ? "/inscription" : "/connexion";

  const h = await headers();
  const hote = h.get("host") ?? "app.wefilmgood.com";
  const protocole = h.get("x-forwarded-proto") ?? (hote.startsWith("localhost") ? "http" : "https");
  const retour = `${protocole}://${hote}/auth/callback?next=${encodeURIComponent(next)}`;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: retour, queryParams: { prompt: "select_account" } },
  });

  if (error || !data.url) {
    redirect(
      `${depuis}?erreur=${encodeURIComponent("La connexion avec Google est momentanément indisponible. Utilisez votre adresse email.")}&next=${encodeURIComponent(next)}`,
    );
  }
  redirect(data.url);
}
