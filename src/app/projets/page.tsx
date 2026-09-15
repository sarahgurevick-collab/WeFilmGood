import Link from "next/link";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";

export default async function ProjetsPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, logline, genre:genres(label_fr)")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  return (
    <PageShell eyebrow="Catalogue" title="Projets">
      {!projects || projects.length === 0 ? (
        <p className={formStyles.hint}>
          Aucun projet public pour l&apos;instant.{" "}
          <Link href="/deposer">Déposez le vôtre</Link>.
        </p>
      ) : (
        <ul className={formStyles.form} style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {projects.map((p) => (
            <li key={p.id}>
              <strong>{p.title}</strong>
              {p.logline && <p className={formStyles.hint}>{p.logline}</p>}
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
