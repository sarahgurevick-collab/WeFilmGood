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
  searchParams: Promise<{ format?: string; mot?: string }>;
}) {
  const supabase = await createClient();
  const { data: estAdmin } = await supabase.rpc("is_admin");
  if (estAdmin !== true) redirect("/");

  const { format: f, mot: m } = await searchParams;
  const format = FORMATS.some((x) => x.cle === f) ? (f ?? "") : "";
  const mot = (m ?? "").trim().toLowerCase();

  const lignes: Ligne[] = [];
  for (let debut = 0; ; debut += 1000) {
    const { data } = await supabase
      .rpc("statistiques_thematiques", { p_format: format || null })
      .range(debut, debut + 999);
    lignes.push(...((data ?? []) as Ligne[]));
    if (!data || data.length < 1000) break;
  }

  const annees = new Map<number, { total: number; mots: Ligne[] }>();
  for (const l of lignes) {
    const a = annees.get(l.annee) ?? { total: l.total, mots: [] };
    a.mots.push(l);
    annees.set(l.annee, a);
  }
  const ordre = [...annees.keys()].sort((a, b) => a - b);
  const lien = (p: { format?: string; mot?: string }) => {
    const q = new URLSearchParams();
    if (p.format) q.set("format", p.format);
    if (p.mot) q.set("mot", p.mot);
    const s = q.toString();
    return `/admin/statistiques${s ? `?${s}` : ""}`;
  };

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Statistiques" theme="clair">
      <p className={formStyles.hint}>
        Les mots-clés des projets, année par année, en part des projets de l&apos;année. 2014 et 2016 viennent des
        archives de lecture. Visible de l&apos;administration seulement.
      </p>

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

      <form className={formStyles.field} style={{ margin: "20px 0" }}>
        {format && <input type="hidden" name="format" value={format} />}
        <input name="mot" defaultValue={mot} placeholder="Un mot-clé : deuil, exil, famille…" style={{ maxWidth: 360 }} />
      </form>

      {mot && (
        <section style={{ marginBottom: 32 }}>
          <h2>« {mot} » année par année</h2>
          <table className={adminStyles.table} style={{ maxWidth: 560 }}>
            <tbody>
              {ordre.map((a) => {
                const { total, mots } = annees.get(a)!;
                const nb = mots.find((l) => l.mot === mot)?.nb ?? 0;
                const part = (100 * nb) / total;
                return (
                  <tr key={a}>
                    <td style={{ width: 50 }}>{a}</td>
                    <td style={{ width: 200 }}>
                      <div style={{ background: "#DA2C25", height: 10, width: `${Math.min(100, part * 4)}%` }} />
                    </td>
                    <td>
                      {nb ? pourcent(nb, total) : "—"} <span style={{ color: "var(--dim)" }}>({nb} sur {total})</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className={formStyles.hint}>Un mot qui n&apos;apparaît qu&apos;une fois dans l&apos;année n&apos;est pas compté.</p>
        </section>
      )}

      <table className={adminStyles.table}>
        <thead>
          <tr>
            <th>Année</th>
            <th>Projets</th>
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
                      <Link href={lien({ format, mot: l.mot })}>{l.mot}</Link>{" "}
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
