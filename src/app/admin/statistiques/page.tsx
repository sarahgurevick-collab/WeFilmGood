import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import adminStyles from "../admin.module.css";
import NavAdmin from "../NavAdmin";

/**
 * Les thématiques des projets année par année (31/10/2026) : les
 * mots-clés des projets (WFG 1 et WFG 2) et des archives de lecture,
 * en part des projets de l'année. Administration seulement pour
 * l'instant ; ce que verront les producteurs reste à décider.
 *
 * 21/11/2026 : les films français sortis en salle (films du CNC, mots
 * tirés de leur résumé public) à côté des projets, pour comparer ce que
 * les auteurs écrivent à ce qui se tourne. Libellés à faire valider.
 */

const FORMATS = [
  { cle: "", libelle: "Tous" },
  { cle: "court_metrage", libelle: "Court métrage" },
  { cle: "long_metrage", libelle: "Long métrage" },
  { cle: "serie", libelle: "Série" },
];

type Ligne = { annee: number; total: number; mot: string; nb: number };

const pourcent = (nb: number, total: number) =>
  `${((100 * nb) / total).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

export default async function StatistiquesPage({
  searchParams,
}: {
  searchParams: Promise<{ format?: string; mot?: string; source?: string }>;
}) {
  const supabase = await createClient();
  const { data: estAdmin } = await supabase.rpc("is_admin");
  if (estAdmin !== true) redirect("/");

  const { format: f, mot: m, source } = await searchParams;
  const films = source === "films";
  const format = FORMATS.some((x) => x.cle === f) ? (f ?? "") : "";
  const mot = (m ?? "").trim().toLowerCase();

  type Annees = Map<number, { total: number; mots: Ligne[] }>;
  const charger = async (fonction: string, args?: Record<string, unknown>): Promise<Annees> => {
    const annees: Annees = new Map();
    // Les pages de 1 000 lignes sont demandées huit par huit, ensemble :
    // une par une, la page mettait plus de dix secondes à s'ouvrir.
    for (let debut = 0, fini = false; !fini; debut += 8000) {
      const pages = await Promise.all(
        Array.from({ length: 8 }, (_, i) =>
          supabase.rpc(fonction, args).range(debut + i * 1000, debut + i * 1000 + 999),
        ),
      );
      for (const { data } of pages) {
        for (const l of (data ?? []) as Ligne[]) {
          const a = annees.get(l.annee) ?? { total: l.total, mots: [] };
          a.mots.push(l);
          annees.set(l.annee, a);
        }
        if (!data || data.length < 1000) fini = true;
      }
    }
    return annees;
  };
  const [anneesProjets, anneesFilms] = await Promise.all([
    charger("statistiques_thematiques", { p_format: format || null }),
    charger("statistiques_thematiques_films"),
  ]);

  const annees = films ? anneesFilms : anneesProjets;
  const ordre = [...annees.keys()].sort((a, b) => a - b);
  const ordreMot = [...new Set([...anneesProjets.keys(), ...anneesFilms.keys()])].sort((a, b) => a - b);
  const lien = (p: { format?: string; mot?: string; films?: boolean }) => {
    const q = new URLSearchParams();
    if (p.films) q.set("source", "films");
    if (p.format) q.set("format", p.format);
    if (p.mot) q.set("mot", p.mot);
    const s = q.toString();
    return `/admin/statistiques${s ? `?${s}` : ""}`;
  };

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Statistiques" theme="clair">
      <p className={formStyles.hint}>
        Les mots-clés des projets, année par année, en part des projets de l&apos;année. 2013 à 2016 viennent des
        archives de lecture, 2017 en partie. Visible de l&apos;administration seulement.
      </p>

      <nav className={adminStyles.annees} aria-label="Projets ou films">
        <Link href={lien({ format, mot })} className={films ? adminStyles.annee : adminStyles.anneeActive}>
          Projets
        </Link>
        <Link href={lien({ format, mot, films: true })} className={films ? adminStyles.anneeActive : adminStyles.annee}>
          Films sortis en salle
        </Link>
      </nav>

      {films ? (
        <p className={formStyles.hint}>
          Les films français agréés par le CNC, à leur année de sortie, avec les mots-clés tirés de leur résumé.
        </p>
      ) : (
        <nav className={adminStyles.annees} aria-label="Format">
          {FORMATS.map((x) => (
            <Link
              key={x.cle}
              href={lien({ format: x.cle, mot })}
              className={x.cle === format ? adminStyles.anneeActive : adminStyles.annee}
            >
              {x.libelle}
            </Link>
          ))}
        </nav>
      )}

      <form className={formStyles.field} style={{ margin: "20px 0" }}>
        {films && <input type="hidden" name="source" value="films" />}
        {format && <input type="hidden" name="format" value={format} />}
        <input name="mot" defaultValue={mot} placeholder="Un mot-clé : deuil, exil, famille…" style={{ maxWidth: 360 }} />
      </form>

      {mot && (
        <section style={{ marginBottom: 32 }}>
          <h2>« {mot} » année par année</h2>
          <table className={adminStyles.table} style={{ maxWidth: 900 }}>
            <thead>
              <tr>
                <th>Année</th>
                <th colSpan={2}>Projets</th>
                <th colSpan={2}>Films sortis en salle</th>
              </tr>
            </thead>
            <tbody>
              {ordreMot.map((a) => (
                <tr key={a}>
                  <td style={{ width: 50 }}>{a}</td>
                  {[anneesProjets, anneesFilms].map((source, i) => {
                    const annee = source.get(a);
                    if (!annee) {
                      return (
                        <td key={i} colSpan={2} style={{ color: "var(--dim)" }}>
                          —
                        </td>
                      );
                    }
                    const nb = annee.mots.find((l) => l.mot === mot)?.nb ?? 0;
                    const part = (100 * nb) / annee.total;
                    return [
                      <td key={`${i}-barre`} style={{ width: 160 }}>
                        <div
                          style={{
                            background: i === 0 ? "#DA2C25" : "#888",
                            height: 10,
                            width: `${Math.min(100, part * 4)}%`,
                          }}
                        />
                      </td>,
                      <td key={`${i}-part`}>
                        {nb ? pourcent(nb, annee.total) : "—"}{" "}
                        <span style={{ color: "var(--dim)" }}>
                          ({nb} sur {annee.total})
                        </span>
                      </td>,
                    ];
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className={formStyles.hint}>Un mot qui n&apos;apparaît qu&apos;une fois dans l&apos;année n&apos;est pas compté.</p>
        </section>
      )}

      <table className={adminStyles.table}>
        <thead>
          <tr>
            <th>Année</th>
            <th>{films ? "Films" : "Projets"}</th>
            <th>Les mots-clés les plus fréquents</th>
          </tr>
        </thead>
        <tbody>
          {ordre.map((a) => {
            const { total, mots } = annees.get(a)!;
            return (
              <tr key={a}>
                <td>{a}</td>
                <td>{total}</td>
                <td>
                  {mots.slice(0, 15).map((l, i) => (
                    <span key={l.mot}>
                      {i > 0 && " · "}
                      <Link href={lien({ format, mot: l.mot, films })}>{l.mot}</Link>{" "}
                      <span style={{ color: "var(--dim)" }}>{pourcent(l.nb, total)}</span>
                    </span>
                  ))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </PageShell>
  );
}
