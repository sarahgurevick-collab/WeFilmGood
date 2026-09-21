import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import LabelWFG from "@/components/LabelWFG";
import VideopitchLecteur from "@/components/VideopitchLecteur";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import PartageProjet from "./PartageProjet";
import { contacterAuteur, setShareLink } from "./actions";
import fichesStyles from "./fiches.module.css";
import EtatDeLecture, { type Etat } from "@/components/EtatDeLecture";
import { prochaineAction, tauxDeRemplissage } from "@/lib/remplissage";
import { createClient } from "@/lib/supabase/server";

const FORMATS_LISIBLES: Record<string, string> = {
  long_metrage: "Long métrage",
  court_metrage: "Court métrage",
  serie: "Série",
  immersif_360_vr: "Format immersif (360/VR)",
};

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
  genre_slug: string | null;
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
      "id, title, logline, synopsis, format, genre_slug, language, country, status, owner_id, share_code, legacy_id, genre:genres(label_fr)",
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

  const { data: estAdmin } = await supabase.rpc("is_admin");

  // « Où en est mon projet ? » — la réponse que l'auteur allait chercher
  // par e-mail auprès de l'administration.
  const { data: etatBrut } = await supabase.rpc("etat_de_lecture", { p_project_id: id });
  const etatLecture = ((etatBrut ?? []) as {
    etat: Etat;
    depose_le: string | null;
  }[])[0];

  const { data: fichiers } = await supabase
    .from("project_files")
    .select("kind")
    .eq("project_id", id)
    .returns<{ kind: string }[]>();

  // Par une fonction dédiée, et non par la table : celle-ci porte
  // l'identifiant du lecteur, que l'auteur ne doit jamais approcher.
  const { data: fichesLectureBrut } = await supabase.rpc("get_legacy_reading_reports", {
    p_project_id: id,
  });
  const fichesHeritees = (fichesLectureBrut ?? []) as FicheLecture[];

  // Les fiches rendues sur WFG 2, sans le prénom du lecteur.
  const { data: fichesPublieesBrut } = await supabase.rpc("fiches_lecture_publiees", {
    p_project_id: id,
  });
  const fichesPubliees = (fichesPublieesBrut ?? []) as {
    report_id: string;
    content: string | null;
    score: number | null;
    submitted_at: string | null;
  }[];

  // Les deux sources réunies, de la plus récente à la plus ancienne. La
  // base ne les renvoie qu'à l'auteur et à l'administration : c'est aussi
  // le travail de WeFilmGood, qui ne doit pas être copié.
  const fichesLecture = [
    ...fichesHeritees.map((f) => ({
      cle: `h${f.legacy_review_id}`,
      date: f.read_at,
      note: f.final_mark,
      contenu: f.content,
      avis: f.wfg_review,
    })),
    ...fichesPubliees.map((f) => ({
      cle: `p${f.report_id}`,
      date: f.submitted_at,
      note: f.score,
      contenu: f.content,
      avis: null as string | null,
    })),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  // Le nombre de fiches, que tout membre peut connaître — sans leur contenu.
  const { data: nombreBrut, error: sansNombre } = await supabase.rpc("nombre_fiches_lecture", {
    p_project_id: id,
  });
  const nombreFiches = sansNombre ? fichesLecture.length : Number(nombreBrut ?? 0);


  const etatFiche = {
    titre: project.title,
    tagline: project.logline,
    logline: project.synopsis,
    genre: project.genre_slug,
    format: project.format,
    aUneVignette: (fichiers ?? []).some((f) => f.kind === "vignette"),
    aUnScenario: (fichiers ?? []).some((f) => f.kind === "scenario"),
  };
  const taux = tauxDeRemplissage(etatFiche);
  const aFaire = prochaineAction(etatFiche);

  const { data: auteur } = await supabase
    .from("profiles")
    .select("id, full_name, display_name")
    .eq("id", project.owner_id)
    .maybeSingle<{ id: string; full_name: string | null; display_name: string | null }>();

  // Les talents que l'auteur a déclarés sur son projet, identifiés par
  // leur adresse. La règle d'accès limite déjà la lecture à l'auteur,
  // aux invités et à l'administration.
  const { data: talents } = await supabase
    .from("project_co_authors")
    .select("id, invited_email, profile_id, status, role:roles(label_fr)")
    .eq("project_id", id)
    .returns<
      {
        id: string;
        invited_email: string;
        profile_id: string | null;
        status: string;
        role: { label_fr: string } | null;
      }[]
    >();

  // À part : si les colonnes n'existent pas encore dans la base, la
  // fiche s'affiche quand même, sans videopitch.
  const { data: videopitch } = await supabase
    .from("projects")
    .select("videopitch_fr, videopitch_en")
    .eq("id", id)
    .maybeSingle<{ videopitch_fr: string | null; videopitch_en: string | null }>();

  const { data: motsCles } = await supabase
    .from("project_keywords")
    .select("keyword:keywords(label_fr)")
    .eq("project_id", id)
    .returns<{ keyword: { label_fr: string } | null }[]>();

  return (
    <PageShell eyebrow="Projet" title={project.title}>
      <p className={formStyles.hint}>
        {[
          project.genre?.label_fr,
          FORMATS_LISIBLES[project.format ?? ""] ?? project.format,
          project.language,
          project.country,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {project.status === "labellise" && (
        <p style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 0" }}>
          <LabelWFG hauteur={38} sansFond />
          <strong>Projet labellisé WeFilmGood</strong>
        </p>
      )}

      {!isOwner && nombreFiches > 0 && (
        <details className={fichesStyles.bouton}>
          <summary>
            {nombreFiches > 1 ? "Fiches de lecture" : "Fiche de lecture"}
            <span
              className={fichesStyles.pastille}
              aria-label={`${nombreFiches} lecture${nombreFiches > 1 ? "s" : ""}`}
            >
              {nombreFiches}
            </span>
            {fichesLecture.length === 0 && <span className={fichesStyles.cadenas}>privée{nombreFiches > 1 ? "s" : ""}</span>}
          </summary>

          {fichesLecture.length === 0 ? (
            <p className={fichesStyles.explication}>
              {nombreFiches > 1
                ? `Ce projet a été lu ${nombreFiches} fois par les lecteurs de WeFilmGood.`
                : "Ce projet a été lu par un lecteur de WeFilmGood."}{" "}
              Les fiches de lecture sont confidentielles. Pour {nombreFiches > 1 ? "les" : "la"} lire,
              demandez-{nombreFiches > 1 ? "les" : "la"} à l&apos;auteur avec le
              formulaire <a href="#contacter">Contacter l&apos;auteur</a> en bas de page,
              ou écrivez à WeFilmGood.
            </p>
          ) : (
            <>
              <p className={fichesStyles.explication}>
                Vous voyez ces fiches parce que vous êtes administratrice. Les autres
                membres ne voient que leur nombre.
              </p>
              <ListeFiches fiches={fichesLecture} />
            </>
          )}
        </details>
      )}

      {(videopitch?.videopitch_fr || videopitch?.videopitch_en) && (
        <VideopitchLecteur
          fr={videopitch.videopitch_fr}
          en={videopitch.videopitch_en}
          titre={project.title}
        />
      )}

      {(isOwner || estAdmin) && (
        <div className={formStyles.remplissage}>
          <div className={formStyles.remplissageEntete}>
            <strong>Qui porte ce projet&nbsp;?</strong>
          </div>

          <p style={{ margin: "12px 0 0" }}>
            <Link href={`/membres/${project.owner_id}`}>
              {auteur?.display_name ?? auteur?.full_name ?? "L'auteur"}
            </Link>{" "}
            <span className={formStyles.hint}>— auteur du projet</span>
          </p>

          {(talents ?? []).length > 0 ? (
            <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
              {(talents ?? []).map((t) => (
                <li key={t.id} style={{ marginTop: 6 }}>
                  {t.profile_id ? (
                    <Link href={`/membres/${t.profile_id}`}>{t.invited_email}</Link>
                  ) : (
                    <a href={`mailto:${t.invited_email}`}>{t.invited_email}</a>
                  )}{" "}
                  <span className={formStyles.hint}>
                    — {t.role?.label_fr ?? "rôle non précisé"}
                    {t.profile_id ? "" : " · pas encore inscrit"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={formStyles.hint} style={{ margin: "10px 0 0" }}>
              Aucun autre talent n&apos;est rattaché à ce projet.
            </p>
          )}
        </div>
      )}

      {(isOwner || estAdmin) && etatLecture && (
        <EtatDeLecture etat={etatLecture.etat} deposeLe={etatLecture.depose_le} />
      )}

      {(isOwner || estAdmin) && (
        <div className={formStyles.remplissage}>
          <div className={formStyles.remplissageEntete}>
            <strong>Fiche remplie à {taux} %</strong>
            <Link href={`/projets/${project.id}/modifier`}>Modifier ma fiche</Link>
          </div>
          <div className={formStyles.jauge} role="img" aria-label={`Fiche remplie à ${taux} pour cent`}>
            <span style={{ width: `${taux}%` }} />
          </div>
          {aFaire ? (
            <p className={formStyles.remplissageTexte}>
              <strong>Il manque&nbsp;:</strong> {aFaire}
            </p>
          ) : (
            <p className={formStyles.remplissageTexte}>
              Votre fiche est complète. Rien ne vous garantit pour autant
              qu&apos;un producteur vous contactera — mais elle est mieux
              placée dans la pitchothèque, et elle donne une bonne image de
              votre travail.
            </p>
          )}
          {aFaire && (
            <p className={formStyles.hint} style={{ margin: "8px 0 0" }}>
              Les fiches complètes apparaissent plus haut dans la pitchothèque.
              C&apos;est une question de visibilité, pas une promesse de
              résultat.
            </p>
          )}
        </div>
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

      {isOwner && fichesLecture.length > 0 && (
        <>
          <h2 style={{ marginTop: 48, fontWeight: 400, fontSize: 16 }}>
            Fiches de lecture
          </h2>
          <p className={formStyles.hint}>
            {fichesLecture.length === 1
              ? "Une lecture a été faite sur ce projet."
              : `${fichesLecture.length} lectures ont été faites sur ce projet, de la plus récente à la plus ancienne.`}
          </p>
          <p className={formStyles.hint}>
            Vos fiches de lecture sont confidentielles : seuls vous et l&apos;équipe
            WeFilmGood les lisez. Les producteurs voient seulement combien de lectures ont
            été faites, et peuvent vous les demander.
          </p>
          <ListeFiches fiches={fichesLecture} />
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
          <h2 id="contacter" style={{ marginTop: 56, fontWeight: 600, fontSize: 17 }}>
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

type FicheAffichee = {
  cle: string;
  date: string | null;
  note: number | null;
  contenu: string | null;
  avis: string | null;
};

function ListeFiches({ fiches }: { fiches: FicheAffichee[] }) {
  return (
    <>
      {fiches.map((f, i) => (
        <details key={f.cle} open={i === 0} className={fichesStyles.fiche}>
          <summary>
            {f.date
              ? new Date(f.date).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "Date inconnue"}
            {f.note !== null && (
              <span style={{ fontWeight: 400 }}>
                {" — "}
                {f.note}/200
                {f.note > 150 && " · labellisé"}
              </span>
            )}
          </summary>
          {f.contenu && <p style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{f.contenu}</p>}
          {f.avis && (
            <>
              <p className={formStyles.hint} style={{ marginTop: 16, marginBottom: 4 }}>
                Avis WeFilmGood
              </p>
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{f.avis}</p>
            </>
          )}
        </details>
      ))}
    </>
  );
}
