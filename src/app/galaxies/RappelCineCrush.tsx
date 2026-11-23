import type { SupabaseClient } from "@supabase/supabase-js";
import { clientCartes } from "@/lib/supabase/admin";
import FenetreCineCrush from "./FenetreCineCrush";

/**
 * Le rappel du CinéCrush sur les Galaxies (24/11/2026, Sarah) : une
 * fenêtre qui rappelle le CinéCrush de la semaine au talent qui arrive.
 * Elle ne s'affiche plus dès qu'il a ouvert la page CinéCrush cette
 * semaine-là (table cinecrush_visites, migration 0326), et revient avec
 * le CinéCrush suivant. Rien si aucune semaine n'est programmée.
 *
 * Les mots sont ceux de la page /cinecrush, déjà validés : le surtitre,
 * le titre, la tagline, le chrono et la phrase de Sarah.
 */

type Crush = {
  semaine: string;
  project: {
    id: string;
    title: string;
    tagline: string | null;
    files: { storage_path: string; kind: string }[];
  } | null;
};

const dateCourte = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

export default async function RappelCineCrush({ supabase, userId }: { supabase: SupabaseClient; userId: string }) {
  const [{ data: dimanche }, { data: fin }] = await Promise.all([
    supabase.rpc("dimanche_de_la_semaine"),
    supabase.rpc("cinecrush_fin_de_semaine"),
  ]);
  if (!dimanche || !fin) return null;

  const [{ data: crush }, { data: visite }] = await Promise.all([
    clientCartes(supabase)
      .from("cinecrush")
      .select("semaine, project:projects(id, title, tagline, files:project_files(storage_path, kind))")
      .eq("semaine", dimanche as string)
      .maybeSingle<Crush>(),
    supabase.from("cinecrush_visites").select("semaine").eq("profile_id", userId).eq("semaine", dimanche as string).maybeSingle(),
  ]);
  if (!crush?.project || visite) return null;

  const chemin = crush.project.files.find((f) => f.kind === "vignette")?.storage_path;
  const { data: signe } = chemin
    ? await supabase.storage.from("project-media").createSignedUrl(chemin, 60 * 60)
    : { data: null };

  return (
    <FenetreCineCrush
      semaine={crush.semaine}
      date={dateCourte(crush.semaine)}
      titre={crush.project.title}
      tagline={crush.project.tagline}
      image={signe?.signedUrl ?? null}
      finMs={Date.parse(fin as string)}
    />
  );
}
