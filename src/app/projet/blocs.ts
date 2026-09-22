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
      "Le titre · la tagline · la logline · le format, le genre, le budget et l'audience · les prix reçus · le scénario.",
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
export type Pourcent = Record<Bloc, number>;

const arrondi = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

/**
 * Où en est chaque bloc de la fiche : le badge ✓ du menu (`fait`, un
 * minimum atteint) et le pourcentage affiché à côté de son titre
 * (`pourcent`, qui monte jusqu'à 100 % seulement quand tout y est —
 * une fiche mieux remplie est mieux mise en avant par le site).
 *
 *  - la fiche : tagline, logline, format, genre, budget, audience,
 *    scénario — sept éléments ;
 *  - les illustrations : l'image de présentation, puis le mood board ;
 *  - les personnages : jusqu'à trois, au-delà desquels le pourcentage
 *    plafonne — un producteur n'a pas besoin d'une liste plus longue
 *    pour se faire une idée du casting.
 */
export async function etatDesBlocs(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ fait: Fait; pourcent: Pourcent }> {
  const [{ data: projet }, { data: fichiers }, { count: personnages }] = await Promise.all([
    supabase
      .from("projects")
      .select("logline, synopsis, format, genre_slug, budget_range, target_audience")
      .eq("id", projectId)
      .maybeSingle(),
    supabase.from("project_files").select("kind").eq("project_id", projectId),
    supabase
      .from("characters")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId),
  ]);

  const genresFichiers = (fichiers ?? []).map((f) => f.kind as string);
  const aVignette = genresFichiers.includes("vignette");
  const aScenario = genresFichiers.includes("scenario");
  const aMoodboard = genresFichiers.includes("moodboard");
  const nombrePersonnages = personnages ?? 0;

  const criteresFiche = [
    !!projet?.logline?.trim(),
    !!projet?.synopsis?.trim(),
    !!projet?.format,
    !!projet?.genre_slug,
    !!projet?.budget_range,
    !!projet?.target_audience,
    aScenario,
  ];

  return {
    fait: {
      fiche: !!projet?.logline?.trim() && !!projet?.synopsis?.trim(),
      illustrations: aVignette,
      personnages: nombrePersonnages > 0,
    },
    pourcent: {
      fiche: arrondi(criteresFiche.filter(Boolean).length, criteresFiche.length),
      illustrations: arrondi([aVignette, aMoodboard].filter(Boolean).length, 2),
      personnages: arrondi(Math.min(nombrePersonnages, 3), 3),
    },
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
  budget_range: string | null;
  target_audience: string | null;
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
      .select(
        "id, owner_id, title, logline, synopsis, format, genre_slug, budget_range, target_audience, has_awards, awards_detail",
      )
      .eq("id", id)
      .maybeSingle<ProjetAModifier>(),
    supabase.rpc("is_admin"),
  ]);
  if (!projet) notFound();

  const estAdmin = admin === true;
  if (projet.owner_id !== user.id && !estAdmin) redirect(`/projet/${id}`);

  return { supabase, user, projet, estAdmin, pourAutrui: estAdmin && projet.owner_id !== user.id };
}
