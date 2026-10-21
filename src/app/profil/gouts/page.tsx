import { redirect } from "next/navigation";
import ResultatMatch from "@/app/cinematch/ResultatMatch";
import { resultatCineMatch } from "@/lib/cinematch";
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

  // Le même résultat que sur la page CinéMatch du Menu (21/10, Sarah) :
  // le match et, en couleur, les réponses communes.
  const { assez, match, adherent, nom, photo, questionsMatchees } = await resultatCineMatch(supabase, user.id);

  return (
    <BlocProfil actif="gouts">
      {assez && <ResultatMatch match={match} adherent={adherent} nom={nom} photo={photo} connecte />}
      <QuestionnaireCineMatch userId={user.id} questionsMatchees={questionsMatchees} />
    </BlocProfil>
  );
}
