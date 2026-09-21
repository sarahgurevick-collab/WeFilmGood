import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Finder from "@/components/Finder";
import { peutVoirLeNuage } from "./actions";
import LabelWFG from "@/components/LabelWFG";
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

export const metadata: Metadata = { title: "Pitchothèque — WeFilmGood" };

const PAR_PAGE = 60;

const SELECTION =
  "id, title, logline, status, genre:genres(label_fr), files:project_files(storage_path, kind)";

export default async function ProjetsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Les vignettes proviennent parfois de films ou d'images trouvées en
  // ligne : la pitchothèque n'est pas exposée aux visiteurs de passage.
  if (!user) {
    redirect("/connexion?next=/pitchotheque");
  }

  const adherent = await peutVoirLeNuage();
  const page = Math.max(1, Math.floor(Number((await searchParams).page)) || 1);

  // L'ordre vient de la base (fonction « pitchotheque ») : labellisés
  // d'abord, puis par tranche de remplissage, tirés au sort chaque nuit.
  const { data: ordre, error: sansOrdre } = await supabase.rpc("pitchotheque", {
    p_limite: PAR_PAGE,
    p_decalage: (page - 1) * PAR_PAGE,
  });
  const lignes = (ordre ?? []) as { id: string; total: number }[];

  let projects: Projet[] | null;
  let total: number;
  if (!sansOrdre) {
    const ids = lignes.map((l) => l.id);
    total = Number(lignes[0]?.total ?? 0);
    const { data } = ids.length
      ? await supabase.from("projects").select(SELECTION).in("id", ids).returns<Projet[]>()
      : { data: [] as Projet[] };
    const rang = new Map(ids.map((id, i) => [id, i]));
    projects = (data ?? []).sort((a, b) => (rang.get(a.id) ?? 0) - (rang.get(b.id) ?? 0));
  } else {
    // Tant que la fonction n'est pas installée dans la base : les plus
    // récents d'abord, comme avant.
    const { data, count } = await supabase
      .from("projects")
      .select(SELECTION, { count: "exact" })
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range((page - 1) * PAR_PAGE, page * PAR_PAGE - 1)
      .returns<Projet[]>();
    projects = data;
    total = count ?? 0;
  }
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));

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
    <PageShell title="Pitchothèque" nav="pitchotheque" connecte={!!user}>
      <Finder adherent={adherent} />

      {!projects || projects.length === 0 ? (
        <p className={formStyles.hint}>
          Aucun projet public pour l&apos;instant.{" "}
          <Link href="/projet">Déposez le vôtre</Link>.
        </p>
      ) : (
        <>
          <p className={formStyles.hint}>
            {total > projects.length
              ? `Projets ${((page - 1) * PAR_PAGE + 1).toLocaleString("fr-FR")} à ${((page - 1) * PAR_PAGE + projects.length).toLocaleString("fr-FR")} sur ${total.toLocaleString("fr-FR")} dans la pitchothèque.`
              : `${total.toLocaleString("fr-FR")} projet${total > 1 ? "s" : ""} dans la pitchothèque.`}
          </p>

          <ul className={styles.grille}>
            {projects.map((p) => {
              const vignette = vignetteDe(p);
              return (
                <li key={p.id}>
                  <Link href={`/projet/${p.id}`} className={styles.carte}>
                    <div className={styles.vignette}>
                      {vignette ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={vignette} alt="" loading="lazy" />
                      ) : (
                        <span className={styles.sansImage}>Sans vignette</span>
                      )}
                      {p.status === "labellise" && (
                        <span className={styles.label}>
                          <LabelWFG hauteur={22} sansFond />
                        </span>
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

          {pages > 1 && (
            <nav className={styles.pagination} aria-label="Pages de la pitchothèque">
              {page > 1 ? (
                <Link href={`/projets?page=${page - 1}`}>← Précédents</Link>
              ) : (
                <span />
              )}
              <span>
                Page {page} sur {pages}
              </span>
              {page < pages ? (
                <Link href={`/projets?page=${page + 1}`}>Suivants →</Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </PageShell>
  );
}
