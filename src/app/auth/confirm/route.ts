import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Cible du lien envoyé par email lors de l'inscription ou de la réinitialisation du mot de passe. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      redirect(next);
    }
    redirect("/connexion?erreur=" + encodeURIComponent("Ce lien n'est plus valide."));
  }

  // Sans jeton dans l'URL, la session est probablement dans le fragment, que
  // le serveur ne reçoit pas. Le navigateur le conserve à travers cette
  // redirection : l'accueil saura le lire.
  redirect("/");
}
