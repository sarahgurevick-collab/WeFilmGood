import type { createClient } from "@/lib/supabase/server";

export type FicheAffichee = {
  cle: string;
  date: string | null;
  note: number | null;
  /** Texte brut pour les fiches de WFG 1, HTML pour celles de WFG 2. */
  contenu: string | null;
  html: boolean;
  avis: string | null;
};

/**
 * Toutes les fiches de lecture d'un projet — héritées de WFG 1 et
 * publiées sur WFG 2 —, de la plus récente à la plus ancienne. La base
 * ne les renvoie qu'à l'auteur et à l'administration : c'est aussi le
 * travail de WeFilmGood, qui ne doit pas être copié.
 */
export async function chargerFiches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<FicheAffichee[]> {
  const [{ data: heritees }, { data: publiees }] = await Promise.all([
    supabase.rpc("get_legacy_reading_reports", { p_project_id: projectId }),
    supabase.rpc("fiches_lecture_publiees", { p_project_id: projectId }),
  ]);

  return [
    ...((heritees ?? []) as {
      legacy_review_id: number;
      content: string | null;
      final_mark: number | null;
      wfg_review: string | null;
      read_at: string | null;
    }[]).map((f) => ({
      cle: `h${f.legacy_review_id}`,
      date: f.read_at,
      note: f.final_mark,
      contenu: f.content,
      html: false,
      avis: f.wfg_review,
    })),
    ...((publiees ?? []) as {
      report_id: string;
      content: string | null;
      score: number | null;
      submitted_at: string | null;
    }[]).map((f) => ({
      cle: `p${f.report_id}`,
      date: f.submitted_at,
      note: f.score,
      contenu: f.content,
      html: true,
      avis: null,
    })),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
