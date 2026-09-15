import adminStyles from "../admin.module.css";
import { createClient } from "@/lib/supabase/server";

/** Lien signé (1h) vers le scénario PDF, ouvert dans un nouvel onglet. */
export default async function ScenarioLink({ projectId }: { projectId: string }) {
  const supabase = await createClient();

  const { data: files } = await supabase
    .from("project_files")
    .select("storage_path")
    .eq("project_id", projectId)
    .eq("kind", "scenario")
    .limit(1);

  const path = files?.[0]?.storage_path;
  if (!path) {
    return <span>—</span>;
  }

  const { data: signed } = await supabase.storage
    .from("scenarios")
    .createSignedUrl(path, 60 * 60);

  if (!signed?.signedUrl) {
    return <span>—</span>;
  }

  return (
    <a
      href={signed.signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={adminStyles.linkButton}
    >
      Ouvrir
    </a>
  );
}
