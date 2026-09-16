import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import styles from "./projets.module.css";
import { createClient } from "@/lib/supabase/server";

type Projet = {
  id: string;
  title: string;
  logline: string | null;
  status: string;
  genre: { label_fr: string } | null;
  files: { storage_path: string; kind: string }[];
};

export default async function ProjetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Les vignettes proviennent parfois de films ou d'images trouvées en
  // ligne : la pitchothèque n'est pas exposée aux visiteurs de passage.
  if (!user) {
    redirect("/connexion?next=/projets");
  }

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, title, logline, status, genre:genres(label_fr), files:project_files(storage_path, kind)",
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .returns<Projet[]>();

  // Le stockage est privé : on signe les vignettes en un seul appel.
  const chemins = (projects ?? [])
    .map((p) => (p.files ?? []).find((f) => f.kind === "vignette")?.storage_path)
    .filter((c): c is string => Boolean(c));

  const { data: signes } = chemins.length
    ? await supabase.storage.from("project-media").createSignedUrls(chemins, 60 * 60)
    : { data: [] };

  const urlDe = new Map((signes ?? []).map((s) => [s.path, s.signedUrl]));

  const vignetteDe = (p: Projet) => {
    const chemin = (p.files ?? []).find((f) => f.kind === "vignette")?.storage_path;
    return chemin ? urlDe.get(chemin) ?? null : null;
  };

  return (
    <PageShell eyebrow="Pitchothèque" title="Projets" wide nav="pitchotheque" connecte={!!user}>
      {!projects || projects.length === 0 ? (
        <p className={formStyles.hint}>
          Aucun projet public pour l&apos;instant.{" "}
          <Link href="/deposer">Déposez le vôtre</Link>.
        </p>
      ) : (
        <>
          <p className={formStyles.hint}>
            {projects.length} projet{projects.length > 1 ? "s" : ""} dans la pitchothèque.
          </p>

          <ul className={styles.grille}>
            {projects.map((p) => {
              const vignette = vignetteDe(p);
              return (
                <li key={p.id}>
                  <Link href={`/projets/${p.id}`} className={styles.carte}>
                    <div className={styles.vignette}>
                      {vignette ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={vignette} alt="" loading="lazy" />
                      ) : (
                        <span className={styles.sansImage}>Sans vignette</span>
                      )}
                      {p.status === "labellise" && (
                        <span className={styles.label}>Labellisé</span>
                      )}
                    </div>
                    <div className={styles.legende}>
                      <strong>{p.title}</strong>
                      {p.genre?.label_fr && (
                        <span className={styles.genre}>{p.genre.label_fr}</span>
                      )}
                      {p.logline && <p className={styles.logline}>{p.logline}</p>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </PageShell>
  );
}
