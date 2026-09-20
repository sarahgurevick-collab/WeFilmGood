"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Se connecter à la place d'un membre, et en revenir.
 *
 * L'administration dépose des PDF, complète des biofilmos et corrige des
 * loglines pour des membres qui ne le feront pas eux-mêmes. C'était un
 * bouton de l'ancienne plateforme, utilisé très souvent.
 *
 * Réservé aux administratrices : la vérification a lieu à chaque appel,
 * sur le serveur, avant toute autre chose.
 *
 * Le retour est assuré : la session de l'administratrice est mise de
 * côté dans un cookie inaccessible au navigateur, et restaurée d'un
 * clic. Sans ce garde-fou, il faudrait se reconnecter à chaque fois.
 *
 * Chaque prise de place est journalisée : tout ce qui est fait dans ce
 * mode est enregistré au nom du membre, et rien d'autre ne permettrait
 * de savoir plus tard qui a réellement agi.
 */
const COOKIE_RETOUR = "wfg_session_admin";
const COOKIE_CIBLE = "wfg_incarne";

export async function prendreLaPlace(formData: FormData) {
  const supabase = await createClient();
  const { data: admin } = await supabase.rpc("is_admin");
  if (admin !== true) redirect("/");

  const cible = formData.get("profile_id") as string;
  if (!cible) redirect("/admin/profils");

  const { data: session } = await supabase.auth.getSession();
  const retour = session.session?.refresh_token;
  if (!retour) redirect("/admin/profils?erreur=session");

  const service = createAdminClient();
  if (!service) redirect("/admin/profils?erreur=service");

  const { data: membre } = await service.auth.admin.getUserById(cible);
  const email = membre.user?.email;
  if (!email) redirect("/admin/profils?erreur=sans-email");

  const { data: lien, error } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const jeton = lien?.properties?.hashed_token;
  if (error || !jeton) redirect("/admin/profils?erreur=lien");

  await supabase.rpc("journaliser_prise_de_place", { p_target: cible });

  const boite = await cookies();
  boite.set(COOKIE_RETOUR, retour, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  boite.set(COOKIE_CIBLE, cible, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  const { error: bascule } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: jeton,
  });
  if (bascule) redirect("/admin/profils?erreur=bascule");

  redirect("/");
}

export async function revenirAMonCompte() {
  const boite = await cookies();
  const retour = boite.get(COOKIE_RETOUR)?.value;

  const supabase = await createClient();
  if (retour) {
    await supabase.auth.refreshSession({ refresh_token: retour });
  }

  boite.delete(COOKIE_RETOUR);
  boite.delete(COOKIE_CIBLE);
  redirect("/admin/profils");
}

/** Le membre dont l'administration a pris la place, s'il y en a un. */
export async function incarnationEnCours(): Promise<string | null> {
  const boite = await cookies();
  return boite.get(COOKIE_CIBLE)?.value ?? null;
}
