import LienScenario from "../LienScenario";
import { createClient } from "@/lib/supabase/server";

/**
 * Lien signé (1h) vers le scénario PDF, ouvert dans un nouvel onglet.
 *
 * Posé à côté du titre plutôt que dans une colonne : l'attribution se
 * fait tous les jours, et ouvrir le scénario est le premier geste pour
 * juger d'un projet.
 */
export default async function ScenarioLink({ projectId }: { projectId: string }) {
  const supabase = await createClient();

  const { data: files } = await supabase
    .from("project_files")
    .select("storage_path")
    .eq("project_id", projectId)
    .eq("kind", "scenario")
    .limit(1);

  const path = files?.[0]?.storage_path;
  if (!path) return null;

  const { data: signed } = await supabase.storage
    .from("scenarios")
    .createSignedUrl(path, 60 * 60);

  if (!signed?.signedUrl) return null;

  return <LienScenario href={signed.signedUrl} />;
}
