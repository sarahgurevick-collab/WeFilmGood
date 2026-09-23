import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VISIO_URL, jetonVisio } from "@/lib/visio";

/**
 * Lien court d'une salle de visio : /visio/<salle>.
 * Un membre connecté est envoyé dans la salle avec son laissez-passer ;
 * les autres passent d'abord par la connexion.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ salle: string }> },
) {
  const { salle } = await params;
  if (!/^[a-z0-9-]{3,60}$/.test(salle)) {
    return new NextResponse("Salle inconnue", { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/visio/${salle}`);

  const [{ data: profil }, { data: isAdmin }] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, full_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("is_admin"),
  ]);

  const nom =
    [profil?.first_name, profil?.last_name].filter(Boolean).join(" ") ||
    profil?.full_name ||
    "Membre WeFilmGood";

  const jwt = jetonVisio({
    salle,
    nom,
    email: user.email,
    moderateur: Boolean(isAdmin),
  });
  redirect(`${VISIO_URL}/${salle}?jwt=${jwt}`);
}
