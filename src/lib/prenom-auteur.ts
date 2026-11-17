import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Le prénom (et lui seul) de l'auteur de chaque projet, pour le lecteur
 * (17/11, Sarah) : savoir à qui il s'adresse. Lu avec la clé de service,
 * parce qu'un lecteur n'a aucun droit de lecture sur les profils. À ne
 * demander que pour des projets que ce lecteur a reçus.
 */
export async function prenomsDesAuteurs(projectIds: string[]): Promise<Map<string, string>> {
  const resultat = new Map<string, string>();
  const admin = createAdminClient();
  if (!admin || projectIds.length === 0) return resultat;

  const { data } = await admin
    .from("projects")
    .select("id, owner:profiles!projects_owner_id_fkey(full_name)")
    .in("id", projectIds)
    .returns<{ id: string; owner: { full_name: string | null } | null }[]>();
  for (const p of data ?? []) {
    const prenom = p.owner?.full_name?.trim().split(/\s+/)[0];
    if (prenom) resultat.set(p.id, prenom);
  }
  return resultat;
}
