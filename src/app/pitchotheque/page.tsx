import type { Metadata } from "next";
import Link from "next/link";
import Bandeau from "@/components/Bandeau";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import Finder from "@/components/Finder";
import VignetteEau from "@/components/VignetteEau";
import { categorieDeDepart, peutVoirLeNuage } from "./actions";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import styles from "./projets.module.css";
import { createClient } from "@/lib/supabase/server";
import RechercheAvancee from "./RechercheAvancee";
import { adresse, lireFiltres, nombreDeFiltres, parametresRpc } from "./filtres";

/**
 * Effet au survol des vignettes. « eau » : l'image ondule comme un reflet
 * dans l'eau (essai du 23/09). « live » : l'effet Live Photo d'avant, gardé
 * de côté — remettre « live » ici suffit pour y revenir.
 */
const EFFET_VIGNETTE: "eau" | "live" = "eau";

type Projet = {
  id: string;
  title: string;
  logline: string | null;
  status: string;
  bandeau: string | null;
  genre: { label_fr: string } | null;
  files: { storage_path: string; kind: string }[];
};

export const metadata: Metadata = { title: "Carte des étoiles — WeFilmGood" };

// Cinq projets par ligne, dix lignes.
const PAR_PAGE = 50;

const SELECTION =
  "id, title, logline, status, bandeau, genre:genres(label_fr), files:project_files(storage_path, kind)";

export default async function ProjetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const params = await searchParams;
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  const filtres = lireFiltres(params);
  const nbFiltres = nombreDeFiltres(filtres);

  // Les vignettes proviennent parfois de films ou d'images trouvées en
  // ligne : la pitchothèque n'est pas exposée aux visiteurs de passage.
  // Un producteur qui reçoit une recherche filtrée par mail est invité à
  // se connecter, ou à créer un compte, et retrouve ensuite la liste
  // filtrée telle qu'on la lui a envoyée — filtres et page compris.
  if (!user) {
    redirect(`/connexion?next=${encodeURIComponent(adresse(filtres, page))}`);
  }

  const [adherent, premiere] = await Promise.all([peutVoirLeNuage(), categorieDeDepart()]);

  const { data: genres } = await supabase.from("genres").select("slug, label_fr").order("position");

  // L'ordre vient de la base (fonction « pitchotheque ») : labellisés
  // d'abord, puis par tranche de remplissage, tirés au sort chaque nuit.
  // Les filtres de la recherche avancée s'appliquent avant l'ordre.
  const { data: ordre, error: sansOrdre } = await supabase.rpc("pitchotheque", {
    p_limite: PAR_PAGE,
    p_decalage: (page - 1) * PAR_PAGE,
    ...parametresRpc(filtres),
  });
  if (sansOrdre) {
    // Le repli qui suit rend la page silencieusement : ce message est le
    // seul endroit où l'échec de la fonction « pitchotheque » se voit.
    console.error("Pitchothèque : fonction pitchotheque en échec, repli sur les plus récents", sansOrdre);
  }
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
    <PageShell
      title="Carte des étoiles"
      // Pour les membres de WFG 1, qui la connaissent sous son ancien nom
      // (changement du 29/09/2026).
      apresTitre={<span className={styles.ancienNom}>l&apos;ancienne Pitchothèque</span>}
      nav="pitchotheque"
      connecte={!!user}
    >
      <Finder adherent={adherent} filtres={filtres} premiere={premiere} requeteInitiale={typeof params.q === "string" ? params.q : ""} />
      <RechercheAvancee filtres={filtres} genres={genres ?? []} />

      {!projects || projects.length === 0 ? (
        <p className={formStyles.hint}>
          {nbFiltres > 0 ? (
            <>
              Aucun projet ne correspond à ces filtres.{" "}
              <Link href={adresse({ format: null, genre: null, audience: null, budget: null, bandeau: null, equipe: null, selection: null, comedien: null })}>
                Tout effacer
              </Link>
              .
            </>
          ) : (
            <>
              Aucun projet public pour l&apos;instant.{" "}
              <Link href="/projet">Déposez le vôtre</Link>.
            </>
          )}
        </p>
      ) : (
        <>
          <p className={formStyles.hint}>
            {total > projects.length
              ? `Projets ${((page - 1) * PAR_PAGE + 1).toLocaleString("fr-FR")} à ${((page - 1) * PAR_PAGE + projects.length).toLocaleString("fr-FR")} sur ${total.toLocaleString("fr-FR")} ${nbFiltres > 0 ? "correspondant à vos filtres" : "dans la Carte des étoiles"}.`
              : `${total.toLocaleString("fr-FR")} projet${total > 1 ? "s" : ""} ${nbFiltres > 0 ? `correspond${total > 1 ? "ent" : ""} à vos filtres` : "dans la Carte des étoiles"}.`}
          </p>

          <ul className={styles.grille}>
            {projects.map((p) => {
              const vignette = vignetteDe(p);
              return (
                <li key={p.id}>
                  <Link
                    href={`/projet/${p.id}`}
                    className={`${styles.carte} ${EFFET_VIGNETTE === "eau" ? styles.eau : ""}`}
                  >
                    <div className={styles.vignette}>
                      <Bandeau valeur={p.bandeau} />
                      {vignette && EFFET_VIGNETTE === "eau" ? (
                        <VignetteEau src={vignette} />
                      ) : vignette ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={vignette} alt="" loading="lazy" />
                        </>
                      ) : (
                        <span className={styles.sansImage}>Sans vignette</span>
                      )}
                    </div>
                    <div className={styles.legende}>
                      <strong>
                        {p.title}
                        {p.status === "labellise" && (
                          <span className={styles.label} title="Projet labellisé WeFilmGood">
                            <Logo size={14} />
                          </span>
                        )}
                      </strong>
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
            <nav className={styles.pagination} aria-label="Pages de la Carte des étoiles">
              {page > 1 ? (
                <Link href={adresse(filtres, page - 1)}>← Précédents</Link>
              ) : (
                <span />
              )}
              <span>
                Page {page} sur {pages}
              </span>
              {page < pages ? (
                <Link href={adresse(filtres, page + 1)}>Suivants →</Link>
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
