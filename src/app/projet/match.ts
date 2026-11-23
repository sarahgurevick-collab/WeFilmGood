import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { signerImages } from "./[id]/fichiers";

/** Combien de mots l'auteur a choisis dans chacun des trois thèmes. */
export type ThemesMatch = { styles: number; sujets: number; univers: number };

/**
 * Le match d'un projet, tel que son auteur le voit (Sarah, 23/11/2026) :
 * le projet de la plateforme le plus proche par les mots-clés. Sans
 * adhésion, la base ne donne que les mots en commun : `projet` est absent.
 */
export type Match = {
  themes: ThemesMatch;
  seuil: number;
  adherent: boolean;
  motsCommuns: string[] | null;
  nouveau: boolean;
  projet: { id: string; titre: string; tagline: string | null; vignette: string | null } | null;
};

type Brut = {
  themes: ThemesMatch;
  seuil: number;
  adherent: boolean;
  mots_communs?: string[];
  nouveau?: boolean;
  projet?: { id: string; titre: string; tagline: string | null } | null;
};

/**
 * Lit le match du projet (fonction mon_match, 0315) : rien pour qui n'est
 * ni l'auteur ni l'administration. La vignette du projet proche est signée
 * par le serveur, seulement quand la base a bien voulu donner le projet.
 */
export async function chargerMatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
): Promise<Match | null> {
  const { data } = await supabase.rpc("mon_match", { p_project: projectId });
  const brut = data as Brut | null;
  if (!brut) return null;

  let vignette: string | null = null;
  const admin = brut.projet ? createAdminClient() : null;
  if (brut.projet && admin) {
    const { data: fichiers } = await admin
      .from("project_files")
      .select("storage_path")
      .eq("project_id", brut.projet.id)
      .eq("kind", "vignette")
      .order("uploaded_at", { ascending: false })
      .limit(1);
    const chemin = fichiers?.[0]?.storage_path ?? null;
    vignette = chemin ? ((await signerImages(admin, [chemin])).get(chemin) ?? null) : null;
  }

  return {
    themes: brut.themes,
    seuil: brut.seuil,
    adherent: brut.adherent,
    motsCommuns: brut.mots_communs ?? null,
    nouveau: brut.nouveau === true,
    projet: brut.projet ? { id: brut.projet.id, titre: brut.projet.titre, tagline: brut.projet.tagline, vignette } : null,
  };
}
