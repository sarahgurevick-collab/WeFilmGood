import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Chemins qu'un lecteur peut atteindre. Tout le reste de la plateforme
 * lui est fermé : il n'a accès qu'aux textes qu'on lui confie. Un lecteur
 * qui veut déposer ses propres projets crée un profil auteur distinct,
 * avec une autre adresse email.
 */
const CHEMINS_LECTEUR = [
  "/lecteur",
  "/deconnexion",
  "/connexion",
  "/auth",
  "/lost-pwd",
  "/nouveau-mot-de-passe",
  "/cguv",
];

/**
 * Rafraîchit la session Supabase à chaque requête et propage les cookies.
 * Sans cela, un utilisateur connecté serait déconnecté dès l'expiration du jeton.
 */
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const dejaAutorise = CHEMINS_LECTEUR.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (user && !dejaAutorise) {
    const [{ data: role }, { data: isAdmin }] = await Promise.all([
      supabase
        .from("profile_roles")
        .select("role_slug")
        .eq("profile_id", user.id)
        .eq("role_slug", "lecteur")
        .maybeSingle(),
      supabase.rpc("is_admin"),
    ]);

    // Un administrateur qui porterait aussi le rôle lecteur garde ses
    // accès : la restriction ne doit pas pouvoir enfermer l'admin dehors.
    if (role && !isAdmin) {
      return NextResponse.redirect(new URL("/lecteur", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
