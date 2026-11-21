import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import adminStyles from "../admin.module.css";
import NavAdmin from "../NavAdmin";

/**
 * Films proches (décision de Sarah, 21/11/2026) : les films français déjà
 * sortis qui portent les mêmes thèmes qu'un projet — pour choisir, par
 * exemple, le long métrage à diffuser avec le CinéCrush de la semaine.
 * Deux recherches : à partir d'un projet (ses mots-clés), ou à partir de
 * thèmes tapés à la main. Le rapprochement se fait dans la base
 * (films_proches, 0300) : les mots rares pèsent plus que les mots courants.
 * Administration seulement ; la page dit quels films sont proches, pas
 * s'ils sont disponibles. Libellés à faire valider.
 *
 * Les films que Sarah a l'autorisation de diffuser (ceux d'Artemondo, 0301)
 * sont dans la même liste que les autres, à leur rang, le titre en vert
 * (Sarah, 21/11/2026 : « plus simple », à la place d'un bloc à part).
 */

type Film = {
  film_id: number;
  titre: string;
  annee: number | null;
  realisateur: string | null;
  genre: string | null;
  tmdb_id: number | null;
  resume: string | null;
  score: number;
  mots_communs: string[];
  mots_film: string[] | null;
  diffusion_autorisee: boolean;
  partenaire: string | null;
  lien: string | null;
  pays: string | null;
  source: string;
};

const ORIGINES = [
  { cle: "", libelle: "Tous les films" },
  { cle: "france", libelle: "Films français" },
  { cle: "etranger", libelle: "Films étrangers" },
];

// « US, GB » → « États-Unis, Royaume-Uni »
const nomsPays = new Intl.DisplayNames(["fr"], { type: "region" });
const paysEnFrancais = (codes: string | null) =>
  (codes ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      try {
        return nomsPays.of(c) ?? c;
      } catch {
        return c;
      }
    })
    .join(", ");

const jour = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

export default async function FilmsProchesPage({
  searchParams,
}: {
  searchParams: Promise<{
    projet?: string;
    titre?: string;
    themes?: string;
    origine?: string;
  }>;
}) {
  const supabase = await createClient();
  const { data: estAdmin } = await supabase.rpc("is_admin");
  if (estAdmin !== true) redirect("/");

  const { projet: p, titre: t, themes: th, origine: o } = await searchParams;
  const origine = ORIGINES.some((x) => x.cle === o) ? (o ?? "") : "";
  const projetId = /^[0-9a-f-]{36}$/i.test(p ?? "") ? p! : "";
  const titre = (t ?? "").trim();
  const themes = (th ?? "").trim();
  const listeThemes = themes
    .split(/[,;\n]+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2);

  // Les derniers CinéCrush, en raccourci.
  const { data: crushs } = await supabase
    .from("cinecrush")
    .select("semaine, project_id, projects(title)")
    .order("semaine", { ascending: false })
    .limit(3);

  // Les projets dont le titre (ou l'ancien titre) contient ce qui est tapé.
  let trouves: { id: string; title: string; ancien_titre: string | null }[] =
    [];
  if (titre && !projetId) {
    const motif = `%${titre.replace(/[%_,()]/g, " ")}%`;
    const { data } = await supabase
      .from("projects")
      .select("id, title, ancien_titre")
      .or(`title.ilike.${motif},ancien_titre.ilike.${motif}`)
      .order("title")
      .limit(30);
    trouves = data ?? [];
  }

  let projet: { id: string; title: string } | null = null;
  let motsProjet: string[] = [];
  if (projetId) {
    const [{ data: pr }, { data: mots }] = await Promise.all([
      supabase
        .from("projects")
        .select("id, title")
        .eq("id", projetId)
        .maybeSingle(),
      supabase
        .from("project_keywords")
        .select("keywords(label_fr)")
        .eq("project_id", projetId),
    ]);
    projet = pr;
    motsProjet = (
      (mots ?? []) as unknown as { keywords: { label_fr: string } | null }[]
    )
      .map((m) => m.keywords?.label_fr ?? "")
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "fr"));
  }

  let films: Film[] = [];
  const cherche = !!projet || listeThemes.length > 0;
  if (cherche) {
    const { data } = await supabase.rpc("films_proches", {
      p_project: projet?.id ?? null,
      p_mots: listeThemes.length ? listeThemes : null,
      p_limite: 40,
      p_origine: origine || null,
    });
    films = (data ?? []) as Film[];
  }

  const lien = (q: { projet?: string; themes?: string; origine?: string }) => {
    const u = new URLSearchParams();
    const og = q.origine ?? origine;
    if (og) u.set("origine", og);
    if (q.projet) u.set("projet", q.projet);
    if (q.themes) u.set("themes", q.themes);
    const s = u.toString();
    return `/admin/films-proches${s ? `?${s}` : ""}`;
  };

  const tableau = (liste: Film[]) => (
    <table className={adminStyles.table}>
      <thead>
        <tr>
          <th>Film</th>
          <th>Mots en commun</th>
          <th>Résumé</th>
        </tr>
      </thead>
      <tbody>
        {liste.map((f) => {
          const communs = [
            ...new Set(f.mots_communs.map((m) => m.toLowerCase())),
          ];
          const autresMots = (f.mots_film ?? []).filter(
            (m) => !communs.includes(m.toLowerCase()),
          );
          return (
            <tr key={f.film_id}>
              <td style={{ width: 220, verticalAlign: "top" }}>
                {/* en vert : un film que Sarah a l'autorisation de diffuser */}
                <strong
                  style={
                    f.diffusion_autorisee ? { color: "#1E8E3E" } : undefined
                  }
                >
                  {f.titre}
                </strong>
                <br />
                <span style={{ color: "var(--dim)" }}>
                  {[f.annee, f.realisateur, paysEnFrancais(f.pays), f.genre]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {f.lien && (
                  <>
                    <br />
                    <a href={f.lien} target="_blank" rel="noreferrer">
                      Voir la page du film
                      {f.partenaire ? ` (${f.partenaire})` : ""}
                    </a>
                  </>
                )}
                {f.tmdb_id && (
                  <>
                    <br />
                    <a
                      href={`https://www.themoviedb.org/movie/${f.tmdb_id}?language=fr`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Voir l&apos;affiche
                    </a>
                  </>
                )}
              </td>
              <td style={{ width: 260, verticalAlign: "top" }}>
                <strong style={{ color: "#DA2C25" }}>
                  {communs.join(", ")}
                </strong>
                {autresMots.length > 0 && (
                  <>
                    <br />
                    <span style={{ color: "var(--dim)" }}>
                      {autresMots.join(", ")}
                    </span>
                  </>
                )}
              </td>
              <td style={{ verticalAlign: "top" }}>{f.resume}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <PageShell
      nav="admin"
      avantTitre={<NavAdmin />}
      title="Films proches"
      theme="clair"
    >
      <p className={formStyles.hint}>
        Les films déjà sortis, français et étrangers, qui portent les mêmes
        thèmes qu&apos;un projet. La page dit quels films sont proches, pas
        s&apos;ils sont disponibles. Visible de l&apos;administration seulement.
      </p>

      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 32, margin: "20px 0" }}
      >
        <form
          className={formStyles.field}
          style={{ flex: "1 1 320px", maxWidth: 460 }}
        >
          <span>À partir d&apos;un projet</span>
          <input
            name="titre"
            aria-label="Le titre du projet"
            defaultValue={titre}
            placeholder="Le titre du projet"
          />
          {themes && <input type="hidden" name="themes" value={themes} />}
          {origine && <input type="hidden" name="origine" value={origine} />}
          <button
            type="submit"
            className={formStyles.submit}
            style={{ marginTop: 8 }}
          >
            Chercher le projet
          </button>
        </form>

        <form
          className={formStyles.field}
          style={{ flex: "1 1 320px", maxWidth: 460 }}
        >
          <span>À partir de thèmes</span>
          <input
            name="themes"
            aria-label="Des thèmes, séparés par des virgules"
            defaultValue={themes}
            placeholder="deuil, fratrie, Bretagne"
          />
          {projetId && <input type="hidden" name="projet" value={projetId} />}
          {origine && <input type="hidden" name="origine" value={origine} />}
          <button
            type="submit"
            className={formStyles.submit}
            style={{ marginTop: 8 }}
          >
            Chercher les films
          </button>
        </form>
      </div>

      {(crushs ?? []).length > 0 && (
        <p className={formStyles.hint}>
          Les derniers CinéCrush :{" "}
          {(crushs ?? []).map((c, i) => {
            const pr = c.projects as unknown as { title: string } | null;
            return (
              <span key={c.project_id + c.semaine}>
                {i > 0 && " · "}
                <Link href={lien({ projet: c.project_id })}>
                  {pr?.title ?? "Projet"}
                </Link>{" "}
                (semaine du {jour(c.semaine)})
              </span>
            );
          })}
        </p>
      )}

      {titre && !projetId && (
        <section style={{ margin: "20px 0" }}>
          {trouves.length === 0 ? (
            <p>Aucun projet ne porte ce titre.</p>
          ) : (
            <>
              <p className={formStyles.hint}>Choisissez le projet :</p>
              <ul>
                {trouves.map((x) => (
                  <li key={x.id}>
                    <Link href={lien({ projet: x.id, themes })}>{x.title}</Link>
                    {x.ancien_titre && (
                      <span style={{ color: "var(--dim)" }}>
                        {" "}
                        (ancien titre : {x.ancien_titre})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {projet && (
        <section style={{ margin: "20px 0" }}>
          <h2>
            <Link href={`/projet/${projet.id}`}>{projet.title}</Link>{" "}
            <Link
              href={lien({ themes })}
              style={{ fontSize: 14, fontWeight: 400 }}
            >
              Retirer
            </Link>
          </h2>
          <p className={formStyles.hint}>
            {motsProjet.length
              ? `Ses mots-clés : ${motsProjet.join(", ")}`
              : "Ce projet n'a pas encore de mots-clés : ajoutez des thèmes à la main."}
          </p>
        </section>
      )}

      {cherche && (
        <nav className={adminStyles.annees} aria-label="Origine des films">
          {ORIGINES.map((x) => (
            <Link
              key={x.cle}
              href={lien({ projet: projetId, themes, origine: x.cle })}
              className={
                x.cle === origine ? adminStyles.anneeActive : adminStyles.annee
              }
            >
              {x.libelle}
            </Link>
          ))}
        </nav>
      )}

      {cherche && films.length === 0 && (
        <p>Aucun film ne partage ces thèmes.</p>
      )}

      {films.length > 0 && tableau(films)}
    </PageShell>
  );
}
