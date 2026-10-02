import { NextResponse, type NextRequest } from "next/server";
import { cheminSur } from "@/lib/lien-magique";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Retour de Google. On échange le code contre une session, puis on emmène
 * la personne là où elle allait — ou, si le compte vient d'être créé, sur
 * le sommaire du profil, comme après une inscription par email.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = cheminSur(searchParams.get("next"));
  const vers = (chemin: string) => NextResponse.redirect(new URL(chemin, origin));

  const echec = () =>
    vers(
      "/connexion?erreur=" +
        encodeURIComponent("La connexion avec Google n'a pas abouti. Réessayez, ou utilisez votre adresse email."),
    );

  if (!code) return echec();

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return echec();

  const user = data.user;
  const nouveau = Date.now() - new Date(user.created_at).getTime() < 5 * 60_000;

  if (nouveau) {
    // Google donne un nom complet ; le formulaire d'inscription, lui, remplit
    // prénom et nom séparément. On complète le profil pour qu'il ait les deux.
    const meta = user.user_metadata ?? {};
    const complet = String(meta.full_name ?? meta.name ?? "").trim();
    const [premier, ...reste] = complet.split(/\s+/);
    const prenom = String(meta.given_name ?? premier ?? "").trim();
    const nom = String(meta.family_name ?? reste.join(" ")).trim();
    const admin = createAdminClient();
    if (admin && (prenom || nom)) {
      const { data: profil } = await admin
        .from("profiles")
        .select("first_name, last_name, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (profil && !profil.first_name && !profil.last_name) {
        await admin
          .from("profiles")
          .update({
            first_name: prenom || null,
            last_name: nom || null,
            full_name: profil.full_name || complet || null,
          })
          .eq("id", user.id);
      }
    }
    return vers(next === "/" ? "/profil?bienvenue=1" : next);
  }

  // Comme après un lien par email : une administratrice commence par les
  // fiches à valider.
  if (next === "/") {
    const { data: estAdmin } = await supabase.rpc("is_admin");
    if (estAdmin === true) return vers("/admin/fiches-a-valider");
    // Un membre déjà inscrit arrive sur la Carte des étoiles (02/10).
    return vers("/pitchotheque");
  }
  return vers(next);
}
