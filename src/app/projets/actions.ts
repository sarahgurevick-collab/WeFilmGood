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

export type ResultatRecherche = {
  projets: ProjetTrouve[];
  total: number;
};

const LIMITE = 60;

export async function rechercherProjets(requete: string): Promise<ResultatRecherche> {
  const q = requete.trim();
  if (!q) return { projets: [], total: 0 };

  const supabase = await createClient();

  const { data: trouves } = await supabase.rpc("rechercher_projets", {
    q,
    p_limite: LIMITE,
  });

  const lignes = (trouves ?? []) as { id: string; score: number; total: number }[];
  const ids: string[] = lignes.map((t) => t.id);
  const total = lignes[0]?.total ?? 0;
  if (ids.length === 0) return { projets: [], total: 0 };

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

  const projets = (projects ?? [])
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

  return { projets, total };
}

export type MotCle = { label: string; effectif: number };

/** Sans recherche en cours : les mots-clés les plus utilisés, pour explorer. */
export async function nuageMotsCles(): Promise<MotCle[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("nuage_mots_cles", { p_limite: 80 });
  const lignes = (data ?? []) as { label_fr: string; effectif: number }[];
  return lignes.map((l) => ({ label: l.label_fr, effectif: l.effectif }));
}

/** Avec une recherche en cours : les mots-clés existants les plus proches de ce qui est tapé. */
export async function motsClesProches(requete: string): Promise<MotCle[]> {
  const q = requete.trim();
  if (!q) return nuageMotsCles();

  const supabase = await createClient();
  const { data } = await supabase.rpc("mots_cles_proches", { q, p_limite: 30 });
  const lignes = (data ?? []) as { label_fr: string; effectif: number; score: number }[];
  return lignes.map((l) => ({ label: l.label_fr, effectif: l.effectif }));
}
