import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import LabelWFG from "@/components/LabelWFG";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import PartageProjet from "./PartageProjet";
import { contacterAuteur, setShareLink } from "./actions";
import { createClient } from "@/lib/supabase/server";

type FicheLecture = {
  legacy_review_id: number;
  content: string | null;
  final_mark: number | null;
  wfg_review: string | null;
  read_at: string | null;
};

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
  legacy_id: string | null;
  share_code: string | null;
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

  // Aucune fiche n'est lisible sans compte : les auteurs protègent leur
  // travail et certaines photos portent des droits à l'image. Le seul
  // chemin public vers un projet est le lien de partage, que son auteur
  // décide d'émettre. On redirige avant d'interroger la base, sinon le
  // visiteur reçoit une page « introuvable » au lieu d'une invitation.
  if (!user) {
    redirect(`/connexion?next=/projets/${id}`);
  }

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, logline, synopsis, format, language, country, status, owner_id, share_code, legacy_id, genre:genres(label_fr)",
    )
    .eq("id", id)
    .maybeSingle<Project>();

  if (!project) {
    notFound();
  }

  const isOwner = user?.id === project.owner_id;

  // Limites introduites par WeFilmGood 2 : les fiches héritées de
  // l'ancienne plateforme gardent leurs textes, mais leur auteur est
  // informé de la nouvelle règle.
  const taglineTropLongue = (project.logline?.length ?? 0) > 300;
  const loglineTropLongue = (project.synopsis?.length ?? 0) > 600;

  const entetes = await headers();
  const hote = entetes.get("host") ?? "localhost:3000";
  const origine = `${hote.startsWith("localhost") ? "http" : "https"}://${hote}`;

  const { data: characters } = await supabase
    .from("characters")
    .select("id, name, character_type, gender, age_range, biography")
    .eq("project_id", id)
    .order("position", { ascending: true });

  const { data: fichesLecture } = await supabase
    .from("legacy_reading_reports")
    .select("legacy_review_id, content, final_mark, wfg_review, read_at")
    .eq("project_id", id)
    .order("read_at", { ascending: false })
    .returns<FicheLecture[]>();

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
      </p>

      {project.status === "labellise" && (
        <p style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 0" }}>
          <LabelWFG hauteur={38} />
          <strong>Projet labellisé WeFilmGood</strong>
        </p>
      )}

      {isOwner && project.legacy_id && (
        <div className={formStyles.avertissement}>
          <p style={{ margin: 0 }}>
            Cette fiche a été créée sur l&apos;ancienne plateforme, où la longueur
            des textes n&apos;était pas limitée. Sur WeFilmGood 2, la tagline tient
            en 300 caractères (une phrase d&apos;accroche) et la logline en 600
            (un petit résumé).
          </p>
          {(taglineTropLongue || loglineTropLongue) && (
            <p style={{ margin: "8px 0 0" }}>
              {taglineTropLongue && (
                <>Votre tagline en compte {project.logline?.length}. </>
              )}
              {loglineTropLongue && (
                <>Votre logline en compte {project.synopsis?.length}. </>
              )}
              {taglineTropLongue && loglineTropLongue
                ? "Elles restent enregistrées telles quelles."
                : "Elle reste enregistrée telle quelle."}{" "}
              Nous vous conseillons néanmoins plus de concision pour respecter ces
              limites.
            </p>
          )}
        </div>
      )}

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

      {(fichesLecture ?? []).length > 0 && (
        <>
          <h2 style={{ marginTop: 48, fontWeight: 400, fontSize: 16 }}>
            Fiches de lecture
          </h2>
          <p className={formStyles.hint}>
            {(fichesLecture ?? []).length === 1
              ? "Une lecture a été faite sur ce projet."
              : `${fichesLecture?.length} lectures ont été faites sur ce projet, de la plus récente à la plus ancienne.`}
          </p>
          {(fichesLecture ?? []).map((f, i) => (
            <details
              key={f.legacy_review_id}
              open={i === 0}
              style={{
                marginTop: 16,
                padding: "12px 16px",
                border: "1px solid #e5e5e5",
                borderRadius: 10,
              }}
            >
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                {f.read_at
                  ? new Date(f.read_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Date inconnue"}
                {f.final_mark !== null && (
                  <span style={{ fontWeight: 400 }}>
                    {" — "}
                    {f.final_mark}/200
                    {f.final_mark > 150 && " · labellisé"}
                  </span>
                )}
              </summary>
              {f.content && (
                <p style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{f.content}</p>
              )}
              {f.wfg_review && (
                <>
                  <p className={formStyles.hint} style={{ marginTop: 16, marginBottom: 4 }}>
                    Avis WeFilmGood
                  </p>
                  <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{f.wfg_review}</p>
                </>
              )}
            </details>
          ))}
        </>
      )}

      {isOwner && (
        <>
          <h2 style={{ marginTop: 56, fontWeight: 600, fontSize: 17 }}>
            Partager ce projet
          </h2>
          <p className={formStyles.hint}>
            {project.share_code
              ? "Toute personne disposant de ce lien peut consulter la fiche, sans avoir de compte, et le transmettre à son tour. Le scénario, lui, reste inaccessible. Vous pouvez désactiver ce lien à tout moment : il cesse alors définitivement de fonctionner, y compris chez ceux à qui il a été transféré."
              : "Créez un lien à envoyer à un producteur. Il ouvre une page de présentation de votre projet — avec le label WeFilmGood s'il est labellisé. Vous pourrez le désactiver quand vous voudrez."}
          </p>

          {project.share_code && (
            <PartageProjet url={`${origine}/p/${project.share_code}`} />
          )}

          <form action={setShareLink} style={{ marginTop: 16 }}>
            <input type="hidden" name="project_id" value={project.id} />
            <input type="hidden" name="actif" value={project.share_code ? "0" : "1"} />
            <button type="submit" className={formStyles.submit}>
              {project.share_code ? "Désactiver ce lien" : "Créer un lien de partage"}
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
