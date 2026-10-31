import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Archives des fiches de lecture (31/10/2026) : les fiches des lecteurs de
 * la Maison pour ses appels à projets (Cannes 2016…). Mémo pour
 * l'administration UNIQUEMENT — n'appeler ces fonctions qu'après avoir
 * vérifié is_admin : elles passent par la clé de service.
 */
export type ArchiveLecture = {
  id: string;
  project_id: string | null;
  titre: string;
  auteurs: string | null;
  lecteur: string | null;
  appel: string | null;
  recue_le: string | null;
  texte: string | null;
  message_lecteur: string | null;
  fichier: string | null;
  fichier_nom: string | null;
  lien: string | null;
};

const COLONNES =
  "id, project_id, titre, auteurs, lecteur, appel, recue_le, texte, message_lecteur, fichier, fichier_nom";

async function avecLiens(lignes: Omit<ArchiveLecture, "lien">[]): Promise<ArchiveLecture[]> {
  const admin = createAdminClient();
  const chemins = lignes.map((l) => l.fichier).filter((c): c is string => Boolean(c));
  const liens = new Map<string, string>();
  if (admin && chemins.length > 0) {
    const { data } = await admin.storage.from("archives-lecture").createSignedUrls(chemins, 60 * 60);
    for (const d of data ?? []) if (d.path && d.signedUrl) liens.set(d.path, d.signedUrl);
  }
  return lignes.map((l) => ({ ...l, lien: l.fichier ? (liens.get(l.fichier) ?? null) : null }));
}

export async function archivesDuProjet(projectId: string): Promise<ArchiveLecture[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("archives_fiches_lecture")
    .select(COLONNES)
    .eq("project_id", projectId)
    .order("recue_le");
  return avecLiens((data ?? []) as Omit<ArchiveLecture, "lien">[]);
}

export async function compterArchives(projectId: string): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  const { count } = await admin
    .from("archives_fiches_lecture")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  return count ?? 0;
}

export async function toutesLesArchives(): Promise<(ArchiveLecture & { projet: string | null })[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const lignes: (Omit<ArchiveLecture, "lien"> & { projects: { title: string } | null })[] = [];
  for (let debut = 0; ; debut += 1000) {
    const { data } = await admin
      .from("archives_fiches_lecture")
      .select(`${COLONNES}, projects(title)`)
      .order("appel")
      .order("titre")
      .range(debut, debut + 999);
    lignes.push(...((data ?? []) as unknown as typeof lignes));
    if (!data || data.length < 1000) break;
  }
  const avec = await avecLiens(lignes.map(({ projects: _p, ...l }) => l));
  return avec.map((l, i) => ({ ...l, projet: lignes[i].projects?.title ?? null }));
}

export const dateArchive = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" })
    : null;
