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

/** L'auteur d'une archive retrouvé sur WFG 2 par son nom (27/11/2026, 0335). */
export type AuteurRelie = { id: string; nom: string };

type LienAuteur = { profile_id: string; profiles: { first_name: string | null; last_name: string | null } | null };
const auteursRelies = (liens: LienAuteur[] | null | undefined): AuteurRelie[] =>
  (liens ?? []).map((l) => ({
    id: l.profile_id,
    nom: [l.profiles?.first_name, l.profiles?.last_name].filter(Boolean).join(" ").trim() || "Sans nom",
  }));

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

/**
 * Les archives reliées au profil d'un auteur (27/11/2026) : celles de ses
 * projets sur WFG 2, et celles reliées à lui par son nom quand le projet lu
 * n'est pas sur le site. Administration seulement.
 */
export async function archivesDuProfil(profileId: string): Promise<(ArchiveLecture & { projet: string | null })[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const [{ data: liens }, { data: projets }] = await Promise.all([
    admin.from("archives_lecture_auteurs").select("archive_id").eq("profile_id", profileId),
    admin.from("projects").select("id").eq("owner_id", profileId),
  ]);
  const ids = (liens ?? []).map((l) => l.archive_id as string);
  const projetIds = (projets ?? []).map((p) => p.id as string);
  if (ids.length === 0 && projetIds.length === 0) return [];
  const filtres = [
    ids.length > 0 ? `id.in.(${ids.join(",")})` : null,
    projetIds.length > 0 ? `project_id.in.(${projetIds.join(",")})` : null,
  ].filter(Boolean);
  const { data } = await admin
    .from("archives_fiches_lecture")
    .select(`${COLONNES}, projects(title)`)
    .or(filtres.join(","))
    .order("recue_le");
  const lignes = (data ?? []) as unknown as (Omit<ArchiveLecture, "lien"> & { projects: { title: string } | null })[];
  const avec = await avecLiens(lignes.map(({ projects: _p, ...l }) => l));
  return avec.map((l, i) => ({ ...l, projet: lignes[i].projects?.title ?? null }));
}

export async function toutesLesArchives(): Promise<(ArchiveLecture & { projet: string | null; relies: AuteurRelie[] })[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const lignes: (Omit<ArchiveLecture, "lien"> & {
    projects: { title: string } | null;
    archives_lecture_auteurs: LienAuteur[] | null;
  })[] = [];
  for (let debut = 0; ; debut += 1000) {
    const { data } = await admin
      .from("archives_fiches_lecture")
      .select(`${COLONNES}, projects(title), archives_lecture_auteurs(profile_id, profiles(first_name, last_name))`)
      .order("appel")
      .order("titre")
      .range(debut, debut + 999);
    lignes.push(...((data ?? []) as unknown as typeof lignes));
    if (!data || data.length < 1000) break;
  }
  const avec = await avecLiens(lignes.map(({ projects: _p, archives_lecture_auteurs: _a, ...l }) => l));
  return avec.map((l, i) => ({
    ...l,
    projet: lignes[i].projects?.title ?? null,
    relies: auteursRelies(lignes[i].archives_lecture_auteurs),
  }));
}

export const dateArchive = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long", year: "numeric" })
    : null;
