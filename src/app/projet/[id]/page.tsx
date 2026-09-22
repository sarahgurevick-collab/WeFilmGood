import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import LabelWFG from "@/components/LabelWFG";
import VideopitchLecteur from "@/components/VideopitchLecteur";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import PartageProjet from "./PartageProjet";
import { contacterAuteur, setShareLink } from "./actions";
import labelStyles from "./label.module.css";
import CadreEquipe, { type MembreEquipe } from "./CadreEquipe";
import EtatDeLecture, { type Etat } from "@/components/EtatDeLecture";
import { prochaineAction, tauxDeRemplissage } from "@/lib/remplissage";
import { createClient } from "@/lib/supabase/server";
import profilStyles from "@/app/profil/profil.module.css";
import { BLOCS, etatDesBlocs, hrefBloc } from "../blocs";
import { AUDIENCES, BUDGETS } from "../ChampsFiche";
import { signerImages } from "./fichiers";
import presentation from "./presentation.module.css";

const FORMATS_LISIBLES: Record<string, string> = {
  long_metrage: "Long métrage",
  court_metrage: "Court métrage",
  serie: "Série",
  immersif_360_vr: "Format immersif (360/VR)",
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
  budget_range: string | null;
  target_audience: string | null;
  share_code: string | null;
  has_awards: boolean;
  awards_detail: string | null;
  genre: { label_fr: string } | null;
};

const BUDGET_LISIBLE = Object.fromEntries(BUDGETS.map((b) => [b.value, b.label]));
const AUDIENCE_LISIBLE = Object.fromEntries(AUDIENCES.map((a) => [a.value, a.label]));

const INITIALE = (nom: string) => nom.trim().charAt(0).toUpperCase() || "?";

const PERSONNAGE_LISIBLE: Record<string, string> = {
  principal: "Personnage principal",
  secondaire: "Personnage secondaire",
  homme: "Homme",
  femme: "Femme",
  autre: "Autre",
  enfant: "Enfant",
  adolescent: "Adolescent",
  adulte: "Adulte",
  senior: "Senior",
};

export default async function ProjetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; enregistre?: string }>;
}) {
  const { id } = await params;
  const { message, enregistre } = await searchParams;

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
    redirect(`/connexion?next=/projet/${id}`);
  }

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, title, logline, synopsis, format, genre_slug, budget_range, target_audience, language, country, status, owner_id, share_code, legacy_id, has_awards, awards_detail, genre:genres(label_fr)",
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
    .select("id, name, photo_path, character_type, gender, age_range, biography")
    .eq("project_id", id)
    .order("position", { ascending: true })
    .returns<
      {
        id: string;
        name: string;
        photo_path: string | null;
        character_type: string | null;
        gender: string | null;
        age_range: string | null;
        biography: string | null;
      }[]
    >();

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
    .select("id, kind, storage_path")
    .eq("project_id", id)
    .order("uploaded_at", { ascending: true })
    .returns<{ id: string; kind: string; storage_path: string }[]>();

  // L'image de présentation (la dernière déposée), le mood board et les
  // portraits : le stockage est privé, on signe les adresses pour une heure.
  const vignette = (fichiers ?? []).filter((f) => f.kind === "vignette").at(-1) ?? null;
  const moodboard = (fichiers ?? []).filter((f) => f.kind === "moodboard");
  const urls = await signerImages(supabase, [
    vignette?.storage_path,
    ...moodboard.map((m) => m.storage_path),
    ...(characters ?? []).map((c) => c.photo_path),
  ]);
  const urlVignette = vignette ? (urls.get(vignette.storage_path) ?? null) : null;

  const etatFiche = {
    titre: project.title,
    tagline: project.logline,
    logline: project.synopsis,
    genre: project.genre_slug,
    format: project.format,
    aUneVignette: !!vignette,
    aUnScenario: (fichiers ?? []).some((f) => f.kind === "scenario"),
    nombrePersonnages: (characters ?? []).length,
  };
  const taux = tauxDeRemplissage(etatFiche);
  const aFaire = prochaineAction(etatFiche);
  const etatBlocs = isOwner || estAdmin ? await etatDesBlocs(supabase, id) : null;
  const prochainBloc = etatBlocs ? (BLOCS.find((b) => !etatBlocs.fait[b.cle]) ?? null) : null;

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

  // Le nombre de fiches de lecture, que tout membre peut connaître. Leur
  // contenu, lui, ne s'ouvre qu'à l'auteur et à l'administration, sur une
  // page à part.
  const { data: nombreBrut } = await supabase.rpc("nombre_fiches_lecture", {
    p_project_id: id,
  });
  const nombreFiches = Number(nombreBrut ?? 0);

  // L'équipe : l'auteur et les talents qui ont accepté d'être rattachés
  // au projet. Tant que la fonction manque dans la base, l'auteur seul.
  const { data: equipeBrut, error: sansEquipe } = await supabase.rpc("equipe_projet", {
    p_project_id: id,
  });
  const equipe: MembreEquipe[] = sansEquipe
    ? [
        {
          cle: project.owner_id,
          profileId: project.owner_id,
          nom: auteur?.display_name ?? auteur?.full_name ?? "L'auteur",
          role: null,
          enAttente: null,
        },
      ]
    : ((equipeBrut ?? []) as { profile_id: string; nom: string | null; role: string | null }[]).map(
        (m) => ({ cle: m.profile_id, profileId: m.profile_id, nom: m.nom ?? "Membre", role: m.role, enAttente: null }),
      );
  // L'auteur et l'administration voient aussi les invitations en attente.
  if (isOwner || estAdmin) {
    for (const t of talents ?? []) {
      if (t.status === "accepte" && t.profile_id) continue;
      if (t.status === "refuse") continue;
      equipe.push({
        cle: t.id,
        profileId: t.profile_id,
        nom: t.invited_email,
        role: t.role?.label_fr ?? null,
        enAttente: t.profile_id ? "Invitation envoyée" : "Pas encore inscrit",
      });
    }
  }

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
    <PageShell
      title={project.title}
      apresTitre={
        project.status === "labellise" ? (
          // Comme le © d'un copyright : le label, en exposant du titre.
          <span className={labelStyles.exposant}>
            <LabelWFG hauteur={30} sansFond />
          </span>
        ) : undefined
      }
    >
      {enregistre && <p className={profilStyles.ok}>Modifications enregistrées.</p>}

      <p className={formStyles.hint}>
        {[
          project.genre?.label_fr,
          FORMATS_LISIBLES[project.format ?? ""] ?? project.format,
          project.language,
          project.country,
          project.budget_range ? BUDGET_LISIBLE[project.budget_range] : null,
          project.target_audience ? AUDIENCE_LISIBLE[project.target_audience] : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {urlVignette && (
        <div className={presentation.hero}>
          <img src={urlVignette} alt="" />
        </div>
      )}

      <CadreEquipe
        projectId={project.id}
        equipe={equipe}
        nombreFiches={nombreFiches}
        peutLireFiches={isOwner || !!estAdmin}
        videopitch={
          videopitch?.videopitch_fr || videopitch?.videopitch_en ? (
            <VideopitchLecteur
              fr={videopitch.videopitch_fr}
              en={videopitch.videopitch_en}
              titre={project.title}
            />
          ) : undefined
        }
      />

      {(isOwner || estAdmin) && etatLecture && (
        <EtatDeLecture etat={etatLecture.etat} deposeLe={etatLecture.depose_le} />
      )}

      {(isOwner || estAdmin) && (
        <div className={formStyles.remplissage}>
          <div className={formStyles.remplissageEntete}>
            <strong>Fiche remplie à {taux} %</strong>
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

          {/* Les trois blocs de la fiche, comme ceux du profil : chacun
              s'ouvre et s'enregistre seul. */}
          <div className={presentation.blocs}>
            {BLOCS.map((b) => {
              const estFait = etatBlocs?.fait[b.cle] ?? false;
              const pourcentBloc = etatBlocs?.pourcent[b.cle] ?? 0;
              const estProchain = prochainBloc?.cle === b.cle;
              return (
                <Link
                  key={b.cle}
                  href={hrefBloc(project.id, b.cle)}
                  className={estProchain ? profilStyles.carteActive : profilStyles.carte}
                >
                  <div className={profilStyles.carteEntete}>
                    <span className={profilStyles.carteTitre}>
                      <span className={estFait ? profilStyles.numeroFait : profilStyles.numero}>
                        {estFait ? "✓" : b.numero}
                      </span>
                      {b.titre}
                    </span>
                    {estFait ? (
                      <span className={profilStyles.badgeFait}>{pourcentBloc} %</span>
                    ) : estProchain ? (
                      <span className={profilStyles.badge}>À faire</span>
                    ) : (
                      <span className={formStyles.hint}>{pourcentBloc} %</span>
                    )}
                  </div>
                  <p className={profilStyles.carteTexte}>{b.resume}</p>
                </Link>
              );
            })}
          </div>
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

      {project.has_awards && (
        <p className={presentation.prix}>
          <strong>Projet primé</strong>
          {project.awards_detail}
        </p>
      )}

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

      {moodboard.length > 0 && (
        <>
          <h2 className={presentation.section}>Moodboard</h2>
          <ul className={presentation.moodboard}>
            {moodboard.map((m) =>
              urls.get(m.storage_path) ? (
                <li key={m.id}>
                  <img src={urls.get(m.storage_path)} alt="" loading="lazy" />
                </li>
              ) : null,
            )}
          </ul>
        </>
      )}

      {(characters ?? []).length > 0 && (
        <>
          <h2 className={presentation.section}>Personnages</h2>
          <ul className={presentation.personnages}>
            {(characters ?? []).map((c) => {
              const portrait = c.photo_path ? urls.get(c.photo_path) : null;
              return (
                <li key={c.id} className={presentation.personnage}>
                  <span className={presentation.portrait} aria-hidden="true">
                    {portrait ? <img src={portrait} alt="" loading="lazy" /> : INITIALE(c.name)}
                  </span>
                  <div>
                    <strong>{c.name}</strong>
                    <p className={formStyles.hint}>
                      {[
                        PERSONNAGE_LISIBLE[c.character_type ?? ""],
                        PERSONNAGE_LISIBLE[c.gender ?? ""],
                        PERSONNAGE_LISIBLE[c.age_range ?? ""],
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {c.biography && <p className={formStyles.hint}>{c.biography}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
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
            <Link href={`/projet/${project.id}/fiche-lecture`}>
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
              <Link href={`/connexion?next=/projet/${project.id}`}>Connectez-vous</Link> pour
              contacter l&apos;auteur de ce projet.
            </p>
          )}
        </>
      )}
    </PageShell>
  );
}

