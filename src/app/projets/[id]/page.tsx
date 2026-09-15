import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";

type Project = {
  id: string;
  title: string;
  logline: string | null;
  synopsis: string | null;
  format: string | null;
  language: string | null;
  country: string | null;
  status: string;
  owner_id: string;
  genre: { label_fr: string } | null;
};

export default async function ProjetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, logline, synopsis, format, language, country, status, owner_id, genre:genres(label_fr)",
    )
    .eq("id", id)
    .maybeSingle<Project>();

  if (!project) {
    notFound();
  }

  const isOwner = user?.id === project.owner_id;
  const { data: characters } = await supabase
    .from("characters")
    .select("id, name, character_type, gender, age_range, biography")
    .eq("project_id", id)
    .order("position", { ascending: true });

  return (
    <PageShell eyebrow="Projet" title={project.title}>
      <p className={formStyles.hint}>
        {[project.genre?.label_fr, project.format, project.language, project.country]
          .filter(Boolean)
          .join(" · ")}
        {project.status === "labellise" && " · Labellisé WFG"}
      </p>

      {project.logline && <p style={{ marginTop: 24 }}>{project.logline}</p>}
      {project.synopsis && <p className={formStyles.hint}>{project.synopsis}</p>}

      {(characters ?? []).length > 0 && (
        <>
          <h2 style={{ marginTop: 48, fontWeight: 400, fontSize: 16 }}>Personnages</h2>
          <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0" }}>
            {(characters ?? []).map((c) => (
              <li key={c.id} style={{ marginBottom: 20 }}>
                <strong>{c.name}</strong>
                <p className={formStyles.hint}>
                  {[c.character_type, c.gender, c.age_range].filter(Boolean).join(" · ")}
                </p>
                {c.biography && <p className={formStyles.hint}>{c.biography}</p>}
              </li>
            ))}
          </ul>
        </>
      )}

      {isOwner && (
        <p className={formStyles.linkRow} style={{ marginTop: 40 }}>
          <Link href={`/projets/${project.id}/fiche-lecture`}>
            Voir la fiche de lecture de mon projet
          </Link>
        </p>
      )}
    </PageShell>
  );
}
