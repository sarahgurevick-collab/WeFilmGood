import Link from "next/link";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";

export default async function MenuPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: isAdmin } = user ? await supabase.rpc("is_admin") : { data: false };

  const { data: readerRole } = user
    ? await supabase
        .from("profile_roles")
        .select("role_slug")
        .eq("profile_id", user.id)
        .eq("role_slug", "lecteur")
        .maybeSingle()
    : { data: null };

  return (
    <PageShell eyebrow="Navigation" title="Menu">
      <nav className={formStyles.form}>
        <Link href="/deposer">Créer une fiche projet</Link>
        <Link href="/projets">Pitchothèque</Link>

        {user ? (
          <>
            <Link href="/profil">Mon profil</Link>
            {readerRole && <Link href="/lecteur">Espace lecteur</Link>}
            {isAdmin && <Link href="/admin">Administration</Link>}
            <p className={formStyles.hint}>Connecté·e : {user.email}</p>
            <form action="/deconnexion" method="post">
              <button type="submit" className={formStyles.submit}>
                Se déconnecter
              </button>
            </form>
          </>
        ) : (
          <>
            <Link href="/connexion">Connexion</Link>
            <Link href="/inscription">Créer un profil</Link>
          </>
        )}
      </nav>
    </PageShell>
  );
}
