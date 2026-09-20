import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import PartageProjet from "./PartageProjet";
import { contacterAuteur, setShareLink } from "./actions";
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
  share_token: string | null;
  genre: { label_fr: string } | null;
};

export default async function ProjetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const { message } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, logline, synopsis, format, language, country, status, owner_id, share_token, genre:genres(label_fr)",
    )
    .eq("id", id)
    .maybeSingle<Project>();

  if (!project) {
    notFound();
  }

  const isOwner = user?.id === project.owner_id;

  const entetes = await headers();
  const hote = entetes.get("host") ?? "localhost:3000";
  const origine = `${hote.startsWith("localhost") ? "http" : "https"}://${hote}`;

  const { data: characters } = await supabase
    .from("characters")
    .select("id, name, character_type, gender, age_range, biography")
    .eq("project_id", id)
    .order("position", { ascending: true });

  const { data: motsCles } = await supabase
    .from("project_keywords")
    .select("keyword:keywords(label_fr)")
    .eq("project_id", id)
    .returns<{ keyword: { label_fr: string } | null }[]>();

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

      {(motsCles ?? []).length > 0 && (
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            padding: 0,
            margin: "20px 0 0",
          }}
        >
          {(motsCles ?? [])
            .map((m) => m.keyword?.label_fr)
            .filter((label): label is string => Boolean(label))
            .map((label) => (
              <li
                key={label}
                style={{
                  border: "1px solid currentColor",
                  borderRadius: 999,
                  padding: "4px 12px",
                  fontSize: 13,
                  opacity: 0.75,
                }}
              >
                {label}
              </li>
            ))}
        </ul>
      )}

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
        <>
          <h2 style={{ marginTop: 56, fontWeight: 600, fontSize: 17 }}>
            Partager ce projet
          </h2>
          <p className={formStyles.hint}>
            {project.share_token
              ? "Toute personne disposant de ce lien peut consulter la fiche, sans avoir de compte. Le scénario, lui, reste inaccessible."
              : "Créez un lien à envoyer à un producteur. Il ouvre une page de présentation de votre projet — avec le label WeFilmGood s'il est labellisé."}
          </p>

          {project.share_token && (
            <PartageProjet url={`${origine}/projets/partage/${project.share_token}`} />
          )}

          <form action={setShareLink} style={{ marginTop: 16 }}>
            <input type="hidden" name="project_id" value={project.id} />
            <input type="hidden" name="actif" value={project.share_token ? "0" : "1"} />
            <button
              type="submit"
              className={project.share_token ? formStyles.hint : formStyles.submit}
              style={project.share_token ? { cursor: "pointer", background: "none", border: "none", padding: 0, textDecoration: "underline" } : undefined}
            >
              {project.share_token ? "Désactiver ce lien" : "Créer un lien de partage"}
            </button>
          </form>

          <p className={formStyles.linkRow} style={{ marginTop: 40 }}>
            <Link href={`/projets/${project.id}/fiche-lecture`}>
              Voir la fiche de lecture de mon projet
            </Link>
          </p>
        </>
      )}

      {!isOwner && (
        <>
          <h2 style={{ marginTop: 56, fontWeight: 600, fontSize: 17 }}>
            Contacter l&apos;auteur
          </h2>

          {message === "envoye" && (
            <p className={formStyles.hint} style={{ color: "#2f7d4f" }}>
              Message envoyé.
            </p>
          )}
          {message === "vide" && (
            <p className={formStyles.hint} style={{ color: "#b3261e" }}>
              Le message ne peut pas être vide.
            </p>
          )}

          {user ? (
            <form action={contacterAuteur} className={formStyles.form} style={{ marginTop: 16 }}>
              <input type="hidden" name="project_id" value={project.id} />
              <input type="hidden" name="recipient_id" value={project.owner_id} />
              <label className={formStyles.field}>
                <span>Votre message</span>
                <textarea name="body" rows={4} required />
              </label>
              <button type="submit" className={formStyles.submit}>
                Envoyer
              </button>
            </form>
          ) : (
            <p className={formStyles.hint}>
              <Link href={`/connexion?next=/projets/${project.id}`}>Connectez-vous</Link> pour
              contacter l&apos;auteur de ce projet.
            </p>
          )}
        </>
      )}
    </PageShell>
  );
}
