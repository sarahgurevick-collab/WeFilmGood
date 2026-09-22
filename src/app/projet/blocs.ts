import type { SupabaseClient } from "@supabase/supabase-js";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * La fiche projet se remplit en trois blocs, comme le profil : la fiche
 * elle-même, ses illustrations, ses personnages. Le premier crée le
 * projet ; les deux autres s'ouvrent ensuite, quand l'auteur veut.
 */
export type Bloc = "fiche" | "illustrations" | "personnages";

export const BLOCS: { cle: Bloc; numero: number; titre: string; resume: string; duree: string }[] = [
  {
    cle: "fiche",
    numero: 1,
    titre: "La fiche",
    resume:
      "Le titre · la tagline · la logline · le format et le genre · les prix reçus · le scénario.",
    duree: "5 minutes · c'est elle qui crée le projet",
  },
  {
    cle: "illustrations",
    numero: 2,
    titre: "Les illustrations",
    resume:
      "L'image de présentation, celle qui représente votre projet dans la pitchothèque · un mood board, visible sur la fiche seulement.",
    duree: "3 minutes · facultatif",
  },
  {
    cle: "personnages",
    numero: 3,
    titre: "Les personnages",
    resume: "Vos personnages, principaux et secondaires : un nom, un portrait, quelques lignes.",
    duree: "5 minutes · facultatif",
  },
];

export function hrefBloc(projectId: string, cle: Bloc) {
  return cle === "fiche" ? `/projet/${projectId}/modifier` : `/projet/${projectId}/${cle}`;
}

export type Fait = Record<Bloc, boolean>;

/**
 * Ce qui est déjà rempli, bloc par bloc. La fiche compte comme faite
 * dès qu'elle a sa tagline et sa logline ; les illustrations dès qu'il y
 * a une image de présentation ; les personnages dès qu'il y en a un.
 */
export async function etatDesBlocs(supabase: SupabaseClient, projectId: string): Promise<Fait> {
  const [{ data: projet }, { data: fichiers }, { count: personnages }] = await Promise.all([
    supabase.from("projects").select("logline, synopsis").eq("id", projectId).maybeSingle(),
    supabase.from("project_files").select("kind").eq("project_id", projectId),
    supabase
      .from("characters")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
  ]);
  const genres = new Set((fichiers ?? []).map((f) => f.kind as string));
  return {
    fiche: !!projet?.logline?.trim() && !!projet?.synopsis?.trim(),
    illustrations: genres.has("vignette"),
    personnages: (personnages ?? 0) > 0,
  };
}

export type ProjetAModifier = {
  id: string;
  owner_id: string;
  title: string;
  logline: string | null;
  synopsis: string | null;
  format: string | null;
  genre_slug: string | null;
  has_awards: boolean;
  awards_detail: string | null;
};

/**
 * Charge un projet pour le modifier, et vérifie que la personne
 * connectée en a le droit : son auteur, ou l'administration — qui
 * corrige souvent les fiches à la place des auteurs. Sinon, retour à
 * la fiche. La base refuserait l'écriture de toute façon ; on évite
 * surtout d'afficher un formulaire qui ne servirait à rien.
 */
export async function chargerProjetAModifier(id: string, cle: Bloc) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=${hrefBloc(id, cle)}`);

  const [{ data: projet }, { data: admin }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, owner_id, title, logline, synopsis, format, genre_slug, has_awards, awards_detail")
      .eq("id", id)
      .maybeSingle<ProjetAModifier>(),
    supabase.rpc("is_admin"),
  ]);
  if (!projet) notFound();

  const estAdmin = admin === true;
  if (projet.owner_id !== user.id && !estAdmin) redirect(`/projet/${id}`);

  return { supabase, user, projet, estAdmin, pourAutrui: estAdmin && projet.owner_id !== user.id };
}
