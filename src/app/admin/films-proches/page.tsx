import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import adminStyles from "../admin.module.css";
import NavAdmin from "../NavAdmin";
import { ajouterFilmAVoir } from "../fiches/films-a-voir-actions";

/**
 * Films proches (Sarah, 21/11/2026) : un outil d'administration, pour
 * toujours, qui l'aide à programmer le meilleur film en regard des projets
 * de WFG — par exemple le long métrage diffusé avec le CinéCrush de la semaine.
 *
 * Un seul champ de recherche par mots-clés, comme celui des Galaxies. D'un
 * côté les projets WFG qui y répondent, de l'autre les films de la base
 * (CNC, TMDB, Artemondo), chacun rangé par pourcentage de pertinence, du
 * plus fort au plus faible. Un projet choisi à gauche devient la recherche :
 * ses mots-clés remplacent ceux tapés.
 * Le calcul est dans la base (films_proches et projets_proches, 0307) : les
 * mots rares pèsent plus que les mots courants ; 100 % = tous les mots
 * cherchés retrouvés à l'identique.
 * En vert : le titre d'un film que Sarah a l'autorisation de diffuser.
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
  pourcent: number | null;
  prix: string[] | null;
  cites: { project_id: string; titre: string; extrait: string | null }[] | null;
};

type Projet = {
  project_id: string;
  titre: string;
  format: string | null;
  score: number;
  mots_communs: string[];
  pourcent: number | null;
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
const sansDoublon = (mots: string[]) => [
  ...new Set(mots.map((m) => m.toLowerCase())),
];
const rouge = { color: "#DA2C25" };
const vert = { color: "#1E8E3E" };

export default async function FilmsProchesPage({
  searchParams,
}: {
  searchParams: Promise<{
    projet?: string;
    q?: string;
    themes?: string;
    origine?: string;
    primes?: string;
    cites?: string;
    integre?: string;
  }>;
}) {
  const supabase = await createClient();
  const { data: estAdmin } = await supabase.rpc("is_admin");
  if (estAdmin !== true) redirect("/");

  const { projet: p, q: qq, themes: th, origine: o, primes: pr, cites: ci, integre: ig } = await searchParams;
  // Affichée sous une fiche à valider (23/11) : sans barre ni titre, pour ne pas la quitter.
  const integre = ig === "1";
  const projetId = /^[0-9a-f-]{36}$/i.test(p ?? "") ? p! : "";
  const q = (qq ?? th ?? "").trim();
  const origine = ORIGINES.some((x) => x.cle === o) ? (o ?? "") : "";
  const primes = pr === "1";
  const cites = ci === "1";
  const mots = q
    .split(/[,;\n]+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 2);

  const lien = (r: { projet?: string; q?: string; origine?: string; primes?: boolean; cites?: boolean }) => {
    const u = new URLSearchParams();
    if (r.projet) u.set("projet", r.projet);
    if (r.q) u.set("q", r.q);
    const og = r.origine ?? origine;
    if (og) u.set("origine", og);
    if (r.primes ?? primes) u.set("primes", "1");
    if (r.cites ?? cites) u.set("cites", "1");
    const t = u.toString();
    if (integre) u.set("integre", "1");
    const t2 = u.toString();
    return `/admin/films-proches${t2 ? `?${t2}` : ""}`;
  };

  // Les derniers CinéCrush, en raccourci.
  const { data: crushs } = await supabase
    .from("cinecrush")
    .select("semaine, project_id, projects(title)")
    .order("semaine", { ascending: false })
    .limit(3);

  let projet: { id: string; title: string } | null = null;
  let motsProjet: string[] = [];
  if (projetId) {
    const [{ data: pr }, { data: mk }] = await Promise.all([
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
      (mk ?? []) as unknown as { keywords: { label_fr: string } | null }[]
    )
      .map((m) => m.keywords?.label_fr ?? "")
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "fr"));
  }

  const cherche = !!projet || mots.length > 0;
  let films: Film[] = [];
  let projets: Projet[] = [];
  let parTitre: { id: string; title: string; ancien_titre: string | null }[] =
    [];
  if (cherche) {
    const motif = `%${q.replace(/[%_,()]/g, " ")}%`;
    const [f, pp, t] = await Promise.all([
      supabase.rpc("films_proches", {
        p_project: projet?.id ?? null,
        p_mots: projet ? null : mots,
        p_limite: 60,
        p_origine: origine || null,
        p_primes: primes,
        p_cites: cites,
      }),
      supabase.rpc("projets_proches", {
        p_project: projet?.id ?? null,
        p_mots: projet ? null : mots,
        p_limite: 60,
      }),
      // comme dans les Galaxies : ce qui est tapé peut aussi être un titre
      !projet && q.length >= 3
        ? supabase
            .from("projects")
            .select("id, title, ancien_titre")
            .or(`title.ilike.${motif},ancien_titre.ilike.${motif}`)
            .order("title")
            .limit(8)
        : Promise.resolve({ data: [] }),
    ]);
    films = (f.data ?? []) as Film[];
    projets = (pp.data ?? []) as Projet[];
    parTitre = (t.data ?? []) as typeof parTitre;
  }

  const pertinence = (n: number | null) => (
    <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{n ?? 0} %</span>
  );

  return (
    <Coque integre={integre}>
      <form
        className={formStyles.field}
        style={{ margin: "8px 0 12px", maxWidth: 640 }}
      >
        <input
          name="q"
          defaultValue={projet ? "" : q}
          placeholder="Chercher un projet, un thème, un mot-clé…"
          aria-label="Chercher un projet, un thème, un mot-clé"
          autoFocus={!cherche}
        />
        {integre && <input type="hidden" name="integre" value="1" />}
        {origine && <input type="hidden" name="origine" value={origine} />}
        {primes && <input type="hidden" name="primes" value="1" />}
        {cites && <input type="hidden" name="cites" value="1" />}
      </form>

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

      {projet && (
        <section style={{ margin: "16px 0" }}>
          <h2 style={{ marginBottom: 4 }}>
            <Link href={`/projet/${projet.id}`}>{projet.title}</Link>{" "}
            <Link href={lien({})} style={{ fontSize: 14, fontWeight: 400 }}>
              Retirer
            </Link>
          </h2>
          <p className={formStyles.hint}>
            {motsProjet.length
              ? `Ses mots-clés : ${motsProjet.join(", ")}`
              : "Ce projet n'a pas encore de mots-clés : cherchez par thèmes."}
          </p>
        </section>
      )}

      {cherche && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 32,
            alignItems: "flex-start",
            marginTop: 20,
          }}
        >
          <section style={{ flex: "1 1 340px", minWidth: 0 }}>
            <h2>Projets WFG</h2>
            {parTitre.length > 0 && (
              <ul style={{ paddingLeft: 18, marginBottom: 12 }}>
                {parTitre.map((x) => (
                  <li key={x.id}>
                    <Link href={lien({ projet: x.id })}>
                      <strong>{x.title}</strong>
                    </Link>
                    {x.ancien_titre && (
                      <span style={{ color: "var(--dim)" }}>
                        {" "}
                        (ancien titre : {x.ancien_titre})
                      </span>
                    )}
                    <span style={{ color: "var(--dim)" }}>
                      {" "}
                      — par son titre
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {projets.length === 0 && parTitre.length === 0 && (
              <p>Aucun projet ne porte ces thèmes.</p>
            )}
            {projets.length > 0 && (
              <table className={adminStyles.table}>
                <tbody>
                  {projets.map((x) => (
                    <tr key={x.project_id}>
                      <td style={{ width: 56, verticalAlign: "top" }}>
                        {pertinence(x.pourcent)}
                      </td>
                      <td style={{ verticalAlign: "top" }}>
                        <Link href={`/projet/${x.project_id}`}>
                          <strong>{x.titre}</strong>
                        </Link>
                        <br />
                        <span style={rouge}>
                          {sansDoublon(x.mots_communs).join(", ")}
                        </span>
                        <br />
                        <Link
                          href={lien({ projet: x.project_id })}
                          style={{ fontSize: 13 }}
                        >
                          Ses films proches
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section style={{ flex: "2 1 520px", minWidth: 0 }}>
            <h2>Films</h2>
            <nav
              className={adminStyles.annees}
              aria-label="Origine des films"
              style={{ marginBottom: 12 }}
            >
              {ORIGINES.map((x) => (
                <Link
                  key={x.cle}
                  href={lien({
                    projet: projetId,
                    q: projet ? "" : q,
                    origine: x.cle,
                  })}
                  className={
                    x.cle === origine
                      ? adminStyles.anneeActive
                      : adminStyles.annee
                  }
                >
                  {x.libelle}
                </Link>
              ))}
              {/* filtre : seulement les films ayant reçu au moins un prix */}
              <Link
                href={lien({
                  projet: projetId,
                  q: projet ? "" : q,
                  primes: !primes,
                })}
                className={primes ? adminStyles.anneeActive : adminStyles.annee}
              >
                Films primés
              </Link>
              {/* filtre : films recommandés ou comparés dans les fiches de lecture */}
              <Link
                href={lien({
                  projet: projetId,
                  q: projet ? "" : q,
                  cites: !cites,
                })}
                className={cites ? adminStyles.anneeActive : adminStyles.annee}
              >
                Films cités
              </Link>
            </nav>
            {films.length === 0 && <p>Aucun film ne partage ces thèmes.</p>}
            {films.length > 0 && (
              <table className={adminStyles.table}>
                <tbody>
                  {films.map((f) => {
                    const communs = sansDoublon(f.mots_communs);
                    const autresMots = (f.mots_film ?? []).filter(
                      (m) => !communs.includes(m.toLowerCase()),
                    );
                    return (
                      <tr key={f.film_id}>
                        <td style={{ width: 56, verticalAlign: "top" }}>
                          {pertinence(f.pourcent)}
                        </td>
                        <td style={{ verticalAlign: "top" }}>
                          {/* en vert : un film que Sarah a l'autorisation de diffuser */}
                          <strong
                            style={f.diffusion_autorisee ? vert : undefined}
                          >
                            {f.titre}
                          </strong>{" "}
                          <span style={{ color: "var(--dim)" }}>
                            {[
                              f.annee,
                              f.realisateur,
                              paysEnFrancais(f.pays),
                              f.genre,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                          {f.prix && f.prix.length > 0 && (
                            <span style={{ fontSize: 13 }}>
                              {" "}
                              🏆 Primé ({f.prix.length})
                            </span>
                          )}
                          <br />
                          <span style={rouge}>{communs.join(", ")}</span>
                          {autresMots.length > 0 && (
                            <span style={{ color: "var(--dim)" }}>
                              {" "}
                              · {autresMots.join(", ")}
                            </span>
                          )}
                          {f.cites && f.cites.length > 0 && (
                            <span style={{ display: "block", fontSize: 13 }}>
                              Cité dans la fiche de lecture de :{" "}
                              {f.cites.map((c, i) => (
                                <span key={c.project_id}>
                                  {i > 0 && ", "}
                                  <Link href={`/projet/${c.project_id}`}>
                                    {c.titre}
                                  </Link>
                                </span>
                              ))}
                            </span>
                          )}
                          {/* un projet est choisi : on peut conseiller ce film à son auteur */}
                          {projet && (
                            <form action={ajouterFilmAVoir} style={{ marginTop: 4 }}>
                              <input type="hidden" name="project_id" value={projet.id} />
                              <input type="hidden" name="film_id" value={f.film_id} />
                              <input type="hidden" name="retour" value={lien({ projet: projet.id })} />
                              <button type="submit" style={{ fontSize: 13, cursor: "pointer" }}>
                                Ajouter aux films à voir de {projet.title}
                              </button>
                            </form>
                          )}
                          <details style={{ marginTop: 4 }}>
                            <summary
                              style={{ cursor: "pointer", fontSize: 13 }}
                            >
                              Résumé
                            </summary>
                            <p style={{ margin: "4px 0" }}>{f.resume}</p>
                            {f.prix && f.prix.length > 0 && (
                              <p style={{ margin: "4px 0" }}>
                                <strong>Prix :</strong> {f.prix.join(" · ")}
                              </p>
                            )}
                            {f.lien && (
                              <a href={f.lien} target="_blank" rel="noreferrer">
                                Voir la page du film
                                {f.partenaire ? ` (${f.partenaire})` : ""}
                              </a>
                            )}
                            {f.lien && f.tmdb_id && " · "}
                            {f.tmdb_id && (
                              <a
                                href={`https://www.themoviedb.org/movie/${f.tmdb_id}?language=fr`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Voir l&apos;affiche
                              </a>
                            )}
                          </details>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </Coque>
  );
}

function Coque({ integre, children }: { integre: boolean; children: ReactNode }) {
  if (integre) {
    return (
      <div className="clair" style={{ background: "var(--bg)", color: "var(--fg)", padding: 16, minHeight: "100vh" }}>
        {children}
      </div>
    );
  }
  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Films proches" theme="clair">
      {children}
    </PageShell>
  );
}
