import type { Metadata } from "next";
import Link from "next/link";
import Frise, { type EtapeFrise } from "@/components/Frise";
import PageShell from "@/components/PageShell";
import VideopitchLecteur from "@/components/VideopitchLecteur";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import Chrono from "./Chrono";
import Commentaires, { type Avis } from "./Commentaires";
import styles from "./cinecrush.module.css";

export const metadata: Metadata = { title: "CinéCrush — WeFilmGood" };

/**
 * CinéCrush (24/10/2026, Sarah) : le coup de pouce de la semaine. En haut,
 * le projet choisi, son videopitch (visible de tous les membres, gratuit),
 * le chrono jusqu'à dimanche minuit et les avis des membres. En dessous,
 * la frise des CinéCrush : celui de la semaine d'abord, puis les anciens,
 * de plus en plus anciens vers la droite. Les semaines programmées à
 * l'avance ne se voient que dans l'admin : « cela doit rester une
 * surprise à chaque semaine » (Sarah, 24/10, après un premier essai où
 * les projets à venir étaient annoncés).
 */

type Crush = {
  id: string;
  semaine: string;
  project: {
    id: string;
    title: string;
    tagline: string | null;
    owner_id: string;
    owner: { full_name: string | null } | null;
    files: { storage_path: string; kind: string }[];
  } | null;
};

const dateCourte = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

/** La phrase de Sarah dans l'orbite d'adhésion (06/10), reprise telle quelle. */
const ACCROCHE =
  "Le chrono est lancé ! Ce videopitch mérite toute ton attention : tu as une semaine pour le découvrir. Laisse un avis en commentaires : ce sont de véritables tremplins magiques pour propulser les histoires !";

export default async function CineCrushPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; attente?: string }>;
}) {
  const { erreur, attente } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <PageShell title="CinéCrush" enTeteAnime connecte={false}>
        <p className={styles.intro}>{ACCROCHE}</p>
        <p className={formStyles.hint}>
          <Link href="/connexion?next=/cinecrush">Connectez-vous</Link> pour découvrir le CinéCrush de la
          semaine.
        </p>
      </PageShell>
    );
  }

  const [{ data: dimanche }, { data: fin }, { data: crushs }, { data: estAdmin }] = await Promise.all([
    supabase.rpc("dimanche_de_la_semaine").returns<string>(),
    supabase.rpc("cinecrush_fin_de_semaine").returns<string>(),
    supabase
      .from("cinecrush")
      .select(
        "id, semaine, project:projects(id, title, tagline, owner_id, owner:profiles!projects_owner_id_fkey(full_name), files:project_files(storage_path, kind))",
      )
      .order("semaine", { ascending: true })
      .returns<Crush[]>(),
    supabase.rpc("is_admin"),
  ]);
  const dimancheEnCours = dimanche as unknown as string;
  const finMs = fin ? Date.parse(fin as unknown as string) : Date.now();
  // La semaine en cours d'abord, puis du plus récent au plus ancien ;
  // rien de ce qui vient.
  const liste = (crushs ?? [])
    .filter((c) => c.project && c.semaine <= dimancheEnCours)
    .sort((a, b) => (a.semaine < b.semaine ? 1 : -1));
  const enCours = liste.find((c) => c.semaine === dimancheEnCours) ?? null;

  // Le stockage est privé : les vignettes sont signées pour une heure.
  const chemins = liste
    .map((c) => c.project!.files.find((f) => f.kind === "vignette")?.storage_path)
    .filter((c): c is string => Boolean(c));
  const { data: signes } = chemins.length
    ? await supabase.storage.from("project-media").createSignedUrls(chemins, 60 * 60)
    : { data: [] };
  const urlDe = new Map((signes ?? []).map((s) => [s.path, s.signedUrl]));
  const vignetteDe = (c: Crush) => {
    const chemin = c.project!.files.find((f) => f.kind === "vignette")?.storage_path;
    return chemin ? (urlDe.get(chemin) ?? null) : null;
  };

  // Le videopitch de la semaine : la base le rend à tout membre connecté
  // (peut_voir_videopitch, migration 0204).
  const { data: videopitch } = enCours
    ? await supabase
        .from("project_videopitchs")
        .select("videopitch_fr, videopitch_en")
        .eq("project_id", enCours.project!.id)
        .maybeSingle<{ videopitch_fr: string | null; videopitch_en: string | null }>()
    : { data: null };

  const { data: avis } = enCours
    ? await supabase
        .from("cinecrush_commentaires")
        .select("id, parent_id, auteur_id, contenu, statut, cree_le, auteur:profiles!cinecrush_commentaires_auteur_id_fkey(full_name)")
        .eq("cinecrush_id", enCours.id)
        .neq("statut", "retire")
        .order("cree_le", { ascending: true })
        .returns<Avis[]>()
    : { data: [] };

  const etapes: EtapeFrise[] = liste.map((c) => {
    const passe = c.semaine < dimancheEnCours;
    const vignette = vignetteDe(c);
    return {
      id: c.id,
      visuel: vignette ? { src: vignette, alt: c.project!.title, forme: "affiche" as const } : undefined,
      etiquette: passe ? "CinéCrush" : "Cette semaine",
      titre: dateCourte(c.semaine),
      detail: (
        <span>
          <Link href={`/projet/${c.project!.id}`}>{c.project!.title}</Link>
          {c.project!.owner?.full_name ? <> — {c.project!.owner.full_name}</> : null}
        </span>
      ),
      passe,
    };
  });
  const imageFrise =
    (enCours && vignetteDe(enCours)) ||
    liste.map(vignetteDe).find((v): v is string => Boolean(v)) ||
    "/association/rencontres/02.jpg";
  const annees = [...new Set(liste.map((c) => c.semaine.slice(0, 4)))].sort();

  return (
    <PageShell title="CinéCrush" enTeteAnime connecte>
      <p className={styles.intro}>{ACCROCHE}</p>

      {!enCours ? (
        <div className={styles.vide}>
          Pas de CinéCrush cette semaine.
          {estAdmin ? (
            <>
              {" "}
              <Link href="/admin/cinecrush">Programmer une semaine</Link>.
            </>
          ) : null}
        </div>
      ) : (
        <section>
          <p className={styles.semaine}>
            Semaine du {dateCourte(enCours.semaine)}
          </p>
          <h2 className={styles.titre}>
            <Link href={`/projet/${enCours.project!.id}`}>{enCours.project!.title}</Link>
          </h2>
          {enCours.project!.tagline && <p className={styles.tagline}>{enCours.project!.tagline}</p>}
          {enCours.project!.owner?.full_name && (
            <p className={styles.auteur}>
              Un projet de{" "}
              <Link href={`/membres/${enCours.project!.owner_id}`}>{enCours.project!.owner.full_name}</Link>
            </p>
          )}
          <Chrono finMs={finMs} />
          {videopitch && (videopitch.videopitch_fr || videopitch.videopitch_en) ? (
            <VideopitchLecteur
              fr={videopitch.videopitch_fr}
              en={videopitch.videopitch_en}
              titre={enCours.project!.title}
            />
          ) : vignetteDe(enCours) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vignetteDe(enCours)!} alt="" className={styles.vignette} />
          ) : null}

          <Commentaires
            cinecrushId={enCours.id}
            auteurProjetId={enCours.project!.owner_id}
            moi={user.id}
            avis={avis ?? []}
            erreur={erreur}
            attente={attente === "1"}
          />
        </section>
      )}

      {liste.length > 0 && (
        <section>
          <h2 className={styles.friseTitre}>Les CinéCrush</h2>
          <p className={styles.friseNote}>Celui de la semaine, puis les précédents.</p>
          <Frise
            etapes={etapes}
            titre="CinéCrush"
            periode={annees.length > 1 ? `${annees[0]} — ${annees[annees.length - 1]}` : annees[0]}
            image={imageFrise}
            imageAlt={enCours ? enCours.project!.title : "CinéCrush"}
          />
        </section>
      )}
    </PageShell>
  );
}
