import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import FicheArchivee from "@/components/FicheArchivee";
import formStyles from "@/components/form.module.css";
import { toutesLesArchives } from "@/lib/archives-lecture";
import { estAdmin } from "@/lib/photos-archives";
import NavAdmin from "../NavAdmin";

/**
 * Toutes les archives des fiches de lecture de la Maison (31/10/2026),
 * rangées par appel à projets. Celles dont le projet n'a pas été retrouvé
 * dans WFG 2 ne sont que là. Administration seulement.
 */
export default async function ArchivesLecturePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  if (!(await estAdmin())) redirect("/");
  const q = ((await searchParams).q ?? "").trim().toLowerCase();
  const toutes = await toutesLesArchives();
  const montrees = q
    ? toutes.filter((f) => [f.titre, f.auteurs, f.lecteur, f.projet].some((v) => v?.toLowerCase().includes(q)))
    : toutes;
  const parAppel = new Map<string, typeof montrees>();
  for (const f of montrees) {
    const cle = f.appel ?? "Sans appel";
    parAppel.set(cle, [...(parAppel.get(cle) ?? []), f]);
  }

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Archives de lecture" theme="clair">
      <p className={formStyles.hint}>
        {toutes.length} fiches, dont {toutes.filter((f) => f.project_id).length} rattachées à un projet de WFG 2.
        Visibles de l&apos;administration seulement.
      </p>
      <form className={formStyles.field} style={{ margin: "12px 0 20px" }}>
        <input
          name="q"
          defaultValue={q}
          placeholder="Titre, auteur ou lecteur"
          style={{ maxWidth: 360 }}
        />
      </form>
      {[...parAppel].map(([appel, fiches]) => (
        <section key={appel} style={{ marginBottom: 28 }}>
          <h2>
            {appel} ({fiches.length})
          </h2>
          {fiches.map((f) => (
            <FicheArchivee key={f.id} f={f} projet={f.projet} />
          ))}
        </section>
      ))}
    </PageShell>
  );
}
