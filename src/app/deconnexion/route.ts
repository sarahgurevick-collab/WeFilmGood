import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  // « local » : on ne ferme que ce navigateur-ci. Par défaut, Supabase
  // fermerait toutes les sessions du compte — se déconnecter sur son
  // téléphone déconnectait aussi l'ordinateur.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
