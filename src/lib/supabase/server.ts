import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Client Supabase pour les composants et actions qui tournent sur le serveur. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Écrire un cookie est impossible depuis un composant serveur rendu :
          // le rafraîchissement de session est assuré par src/proxy.ts.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // appelé depuis un Server Component : sans effet, c'est attendu.
          }
        },
      },
    },
  );
}
