"use server";

import { createClient } from "@/lib/supabase/server";

export type ProjetTrouve = {
  id: string;
  title: string;
  logline: string | null;
  status: string;
  genre: { label_fr: string } | null;
  vignette: string | null;
};

export async function rechercherProjets(requete: string): Promise<ProjetTrouve[]> {
  const q = requete.trim();
  if (!q) return [];

  const supabase = await createClient();

  const { data: trouves } = await supabase.rpc("rechercher_projets", {
    q,
    p_limite: 60,
  });

  const lignes = (trouves ?? []) as { id: string; score: number }[];
  const ids: string[] = lignes.map((t) => t.id);
  if (ids.length === 0) return [];

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, title, logline, status, genre:genres(label_fr), files:project_files(storage_path, kind)",
    )
    .in("id", ids)
    .returns<
      {
        id: string;
        title: string;
        logline: string | null;
        status: string;
        genre: { label_fr: string } | null;
        files: { storage_path: string; kind: string }[];
      }[]
    >();

  const chemins = (projects ?? [])
    .map((p) => (p.files ?? []).find((f) => f.kind === "vignette")?.storage_path)
    .filter((c): c is string => Boolean(c));

  const { data: signes } = chemins.length
    ? await supabase.storage.from("project-media").createSignedUrls(chemins, 60 * 60)
    : { data: [] };

  const urlDe = new Map((signes ?? []).map((s) => [s.path, s.signedUrl]));
  const ordreDe = new Map<string, number>(ids.map((id, i) => [id, i]));

  return (projects ?? [])
    .map((p) => {
      const chemin = (p.files ?? []).find((f) => f.kind === "vignette")?.storage_path;
      return {
        id: p.id,
        title: p.title,
        logline: p.logline,
        status: p.status,
        genre: p.genre,
        vignette: chemin ? (urlDe.get(chemin) ?? null) : null,
      };
    })
    .sort((a, b) => (ordreDe.get(a.id) ?? 0) - (ordreDe.get(b.id) ?? 0));
}
