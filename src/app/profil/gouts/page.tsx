import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BlocProfil from "../BlocProfil";
import QuestionnaireCineMatch from "./QuestionnaireCineMatch";

/**
 * Bloc 3 — CinéMatch : le portrait chinois de WFG 1, vingt questions
 * « si j'étais… », et rien d'autre (le formulaire est partagé avec la page
 * CinéMatch du Menu).
 */
export default async function GoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/profil/gouts");

  return (
    <BlocProfil actif="gouts">
      <QuestionnaireCineMatch userId={user.id} />
    </BlocProfil>
  );
}
