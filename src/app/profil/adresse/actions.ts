"use server";

import { redirect } from "next/navigation";
import {
  confirmerChangementAdresse,
  demanderChangementAdresse,
  verifierNouvelleAdresse,
} from "@/lib/changement-adresse";
import { envoyerLienDeConnexion } from "@/lib/lien-magique";
import { createClient } from "@/lib/supabase/server";

/** Le membre demande une nouvelle adresse : le lien part dessus. */
export async function demanderAdresse(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/profil/adresse");

  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const erreur = await verifierNouvelleAdresse(email, user.email);
  if (erreur) redirect(`/profil/adresse?erreur=${encodeURIComponent(erreur)}`);

  const { data: profil } = await supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle();
  const echec = await demanderChangementAdresse(user.id, profil?.first_name ?? null, email);
  if (echec) redirect(`/profil/adresse?erreur=${encodeURIComponent(echec)}`);

  redirect(`/profil/adresse?envoye=${encodeURIComponent(email)}`);
}

/**
 * Au clic sur le bouton de la page de confirmation. Si ce navigateur n'est
 * pas connecté, un lien de connexion part à la nouvelle adresse.
 */
export async function confirmerAdresse(formData: FormData) {
  const jeton = (formData.get("jeton") as string) ?? "";
  const resultat = await confirmerChangementAdresse(jeton);
  if (!resultat.ok) redirect(`/profil/adresse/confirmer?erreur=${encodeURIComponent(resultat.erreur)}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === resultat.profileId) redirect("/profil/identite?adresse=1");

  await envoyerLienDeConnexion(resultat.email, "/profil/identite?adresse=1");
  redirect(`/connexion?envoye=${encodeURIComponent(resultat.email)}`);
}
