import adminStyles from "../admin.module.css";
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

  return (
    <a
      href={signed.signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={adminStyles.iconePdf}
      title="Ouvrir le scénario (nouvel onglet)"
      aria-label="Ouvrir le scénario dans un nouvel onglet"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6" />
        <path d="m9 15 3 3 3-3" />
      </svg>
    </a>
  );
}
