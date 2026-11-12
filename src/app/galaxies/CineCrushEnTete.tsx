import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import Chrono from "@/app/cinecrush/Chrono";
import { clientCartes } from "@/lib/supabase/admin";
import styles from "./duo.module.css";

/**
 * Le CinéCrush de la semaine, seul en haut des Galaxies (12/11/2026,
 * Sarah). Mêmes données et mêmes mots que la page /cinecrush, vers
 * laquelle tout le bloc renvoie. Rien si aucune semaine n'est programmée.
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

export default async function CineCrushEnTete({ supabase }: { supabase: SupabaseClient }) {
  const [{ data: dimanche }, { data: fin }] = await Promise.all([
    supabase.rpc("dimanche_de_la_semaine"),
    supabase.rpc("cinecrush_fin_de_semaine"),
  ]);
  if (!dimanche || !fin) return null;

  const { data: crush } = await clientCartes(supabase)
    .from("cinecrush")
    .select("semaine, project:projects(id, title, tagline, files:project_files(storage_path, kind))")
    .eq("semaine", dimanche as string)
    .maybeSingle<Crush>();
  if (!crush?.project) return null;

  const chemin = crush.project.files.find((f) => f.kind === "vignette")?.storage_path;
  const { data: signe } = chemin
    ? await supabase.storage.from("project-media").createSignedUrl(chemin, 60 * 60)
    : { data: null };
  const finMs = Date.parse(fin as string);

  return (
    <section className={styles.crush}>
      {signe?.signedUrl && (
        <Link href="/cinecrush" className={styles.crushImage} aria-hidden="true" tabIndex={-1}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={signe.signedUrl} alt="" />
        </Link>
      )}
      <div>
        <p className={styles.crushSurtitre}>
          CinéCrush <span>· Semaine du {dateCourte(crush.semaine)}</span>
        </p>
        <h2 className={styles.crushTitre}>
          <Link href="/cinecrush">{crush.project.title}</Link>
        </h2>
        {crush.project.tagline && <p className={styles.crushTagline}>{crush.project.tagline}</p>}
        <Chrono finMs={finMs} />
      </div>
    </section>
  );
}
