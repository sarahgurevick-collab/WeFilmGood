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

export type DecompteRecherche = {
  projets: number;
  talents: number;
  personnages: number;
};

/**
 * Le décompte affiché sur la page d'accueil : des nombres, jamais de
 * contenu. Les fiches sont réservées aux membres — droits à l'image sur
 * certaines photos, et protection du travail des auteurs, dont même la
 * logline ne s'adresse qu'à des professionnels.
 */
export async function compterRecherche(requete: string): Promise<DecompteRecherche> {
  const q = requete.trim();
  const vide = { projets: 0, talents: 0, personnages: 0 };
  if (!q) return vide;

  const supabase = await createClient();
  const { data } = await supabase.rpc("compter_recherche", { q });
  const ligne = (data ?? [])[0] as DecompteRecherche | undefined;
  return ligne ?? vide;
}

export type MotNuage = { label: string; poids: number };

/**
 * L'aperçu du nuage pour la page d'accueil : des mots et leur poids
 * relatif, rien de plus. Pas d'effectif chiffré, aucun lien vers un
 * projet, et rien de cliquable — le nuage complet, les chiffres et la
 * recherche par mots-clés sont réservés aux adhérents.
 */
export async function nuagePublic(limite = 15): Promise<MotNuage[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("nuage_public", { p_limite: limite });
  return ((data ?? []) as { label_fr: string; poids: number }[]).map((m) => ({
    label: m.label_fr,
    poids: m.poids ?? 0,
  }));
}
