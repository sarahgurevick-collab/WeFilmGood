import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import LabelWFG from "@/components/LabelWFG";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import PartageProjet from "./PartageProjet";
import { choisirVisibilite, setShareLink } from "./actions";
import labelStyles from "./label.module.css";
import CadreEquipe, { type MembreEquipe } from "./CadreEquipe";
import EtatDeLecture, { type Etat } from "@/components/EtatDeLecture";
import { prochaineAction, tauxDeRemplissage } from "@/lib/remplissage";
import { createClient } from "@/lib/supabase/server";
import profilStyles from "@/app/profil/profil.module.css";
import { BLOCS, etatDesBlocs, hrefBloc } from "../blocs";
import { AUDIENCES, BUDGETS } from "../ChampsFiche";
import { signerImages } from "./fichiers";
import { chargerFiches } from "./fiches-donnees";
import presentation from "./presentation.module.css";
import { nomDeLangue } from "@/lib/langues";

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
  bandeau: string | null;
  visible_pour: string[] | null;
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
  searchParams: Promise<{ message?: string; enregistre?: string; depuis?: string; personnage?: string }>;
}) {
  const { id } = await params;
  const { enregistre, depuis, personnage } = await searchParams;

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
      "id, title, logline, synopsis, format, genre_slug, budget_range, target_audience, language, country, status, bandeau, visible_pour, owner_id, share_code, legacy_id, has_awards, awards_detail, genre:genres(label_fr)",
    )
    .eq("id", id)
    .maybeSingle<Project>();

  if (!project) {
    notFound();
  }

  const isOwner = user?.id === project.owner_id;

  // Le videopitch réservé à certains métiers (27/09) : un porteur adhérent
  // peut le cacher aux autres. La fiche, elle, reste visible de tous.
  let videopitchVisible = true;
  if (project.visible_pour) {
    const { data: visible } = await supabase.rpc("projet_visible_pour_moi", {
      p_owner: project.owner_id,
      p_visible: project.visible_pour,
    });
    videopitchVisible = visible !== false;
  }
  const { data: porteurAdherent } = isOwner
    ? await supabase.rpc("a_une_adhesion_active", { p_profile_id: project.owner_id })
    : { data: false };
  const { data: metiers } = isOwner
    ? await supabase
        .from("roles")
        .select("slug, label_fr")
        // Les métiers du site (lecteur, agent, diffuseur… sont au-delà de 90).
        .lt("position", 90)
        .order("position")
    : { data: null };

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
  // Les sélections de la Maison des Scénaristes (Cannes 2019, PCDV 2022…)
  // et les comédiens envisagés par l'auteur, repris de WFG 1 (28/09) :
  // visibles des membres, et filtres de la recherche avancée.
  const [{ data: selections }, { data: comediens }] = await Promise.all([
    supabase.from("project_selections").select("libelle").eq("project_id", id).order("libelle"),
    supabase.from("project_actors").select("libelle").eq("project_id", id).order("libelle"),
  ]);


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
  // Les fiches de lecture (héritées et publiées) : la base ne les rend
  // qu'à l'auteur et à l'administration. Un bouton y mène s'il y en a.
  const fiches = isOwner || estAdmin ? await chargerFiches(supabase, id) : [];
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

  // La phrase d'encouragement des lecteurs, pour un projet labellisé.
  const { data: avisWfg } = await supabase.rpc("avis_wfg_projet", { p_project_id: id });

  // Les photos de l'équipe, pour le côté « L'auteur » du cadre.
  const idsEquipe = equipe.map((m) => m.profileId).filter((x): x is string => !!x);
  if (idsEquipe.length) {
    const { data: photos } = await supabase
      .from("profiles")
      .select("id, avatar_url")
      .in("id", idsEquipe);
    const parId = new Map((photos ?? []).map((ph) => [ph.id as string, ph.avatar_url as string | null]));
    for (const m of equipe) m.photo = m.profileId ? (parId.get(m.profileId) ?? null) : null;
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

      {/* Sous le titre, sur une seule ligne : genre, format, langue, budget,
          audience, puis, pour l'admin seulement, les mots-clés — écrits
          comme du texte, pas en boutons : ils ne sont pas cliquables. Un
          mot-clé qui répète le genre (« drame ») n'est pas écrit deux fois. */}
      <p className={formStyles.hint}>
        {(() => {
          const reperes = [
            project.genre?.label_fr,
            FORMATS_LISIBLES[project.format ?? ""] ?? project.format,
            nomDeLangue(project.language),
            // Pas de budget ni d'audience pour un court métrage (27/09).
            project.format !== "court_metrage" && project.budget_range ? BUDGET_LISIBLE[project.budget_range] : null,
            project.format !== "court_metrage" && project.target_audience ? AUDIENCE_LISIBLE[project.target_audience] : null,
          ].filter((x): x is string => Boolean(x));
          // Les mots-clés servent à la recherche, en coulisse : seule
          // l'admin les voit ici, pour comprendre pourquoi un projet sort
          // dans une recherche (01/10).
          if (!estAdmin) return reperes.join(" · ");
          const deja = new Set(reperes.map((r) => r.toLowerCase()));
          const mots = (motsCles ?? [])
            .map((m) => m.keyword?.label_fr)
            .filter((label): label is string => Boolean(label) && !deja.has(label!.toLowerCase()));
          return [...reperes, ...mots].join(" · ");
        })()}
      </p>

      {/* La tagline et la logline, sous le titre, avant le cadre : sous le
          cadre, elles se perdaient (01/10). */}
      {project.logline && <p style={{ marginTop: 12 }}>{project.logline}</p>}
      {project.synopsis && <p className={formStyles.hint}>{project.synopsis}</p>}

      {/* L'image de présentation est dans le cadre, côté « La fiche ». */}
      <CadreEquipe
        retourSaisie={
          isOwner || estAdmin
            ? hrefBloc(id, BLOCS.find((b) => b.cle === depuis)?.cle ?? "fiche")
            : null
        }
        equipe={equipe}
        personnageOuvert={personnage ?? null}
        personnages={(characters ?? []).map((c) => ({
          id: c.id,
          nom: c.name,
          portrait: c.photo_path ? (urls.get(c.photo_path) ?? null) : null,
          infos: [
            PERSONNAGE_LISIBLE[c.character_type ?? ""],
            PERSONNAGE_LISIBLE[c.gender ?? ""],
            PERSONNAGE_LISIBLE[c.age_range ?? ""],
          ]
            .filter(Boolean)
            .join(" · "),
          bio: c.biography,
        }))}
        moodboard={moodboard.map((m) => urls.get(m.storage_path)).filter((u): u is string => Boolean(u))}
        image={urlVignette ?? null}
        bandeau={project.bandeau ?? null}
        avis={(avisWfg as string | null) ?? null}
        videopitch={
          videopitchVisible && (videopitch?.videopitch_fr || videopitch?.videopitch_en)
            ? { fr: videopitch.videopitch_fr, en: videopitch.videopitch_en, titre: project.title }
            : undefined
        }
      />

      {/* Sous le cadre : les prix — puis les sélections et comédiens repris
          de WFG 1, en petit (28/09 : page allégée à la demande de Sarah). */}
      {project.has_awards && (
        <p className={presentation.prix}>
          <strong>Projet primé</strong>
          {project.awards_detail}
        </p>
      )}
      {((selections ?? []).length > 0 || (comediens ?? []).length > 0) && (
        <p className={formStyles.hint} style={{ marginTop: 12 }}>
          {(selections ?? []).length > 0 && (
            <>Sélection de la Maison des Scénaristes : {(selections ?? []).map((x) => x.libelle).join(" · ")}</>
          )}
          {(selections ?? []).length > 0 && (comediens ?? []).length > 0 && <br />}
          {(comediens ?? []).length > 0 && (
            <>Comédien·ne·s envisagé·e·s : {(comediens ?? []).map((c) => c.libelle).join(" · ")}</>
          )}
        </p>
      )}

      {/* Le bouton vers les fiches de lecture, sous le cadre (26/09) :
          l'auteur et l'administration seulement, et seulement s'il y en a. */}
      {fiches.length > 0 && (
        <p style={{ marginTop: 20 }}>
          <Link href={`/projet/${project.id}/fiches`} className={formStyles.submit} style={{ display: "inline-block" }}>
            Fiches de lecture ({fiches.length})
          </Link>
        </p>
      )}

      {/* Seulement du dépôt à la validation de la fiche de lecture :
          une fois l'analyse disponible, le suivi n'a plus d'objet. */}
      {(isOwner || estAdmin) && etatLecture && etatLecture.etat !== "disponible" && (
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
              placée dans la Carte des étoiles, et elle donne une bonne image de
              votre travail.
            </p>
          )}
          {aFaire && (
            <p className={formStyles.hint} style={{ margin: "8px 0 0" }}>
              Les fiches complètes apparaissent plus haut dans la Carte des étoiles.
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


      {isOwner && (
        <>
          {/* Qui voit le videopitch (27/09) : réservé aux porteurs adhérents ;
              pour les autres, le bloc n'apparaît pas du tout. */}
          {porteurAdherent && (
            <>
              <h2 style={{ marginTop: 40, fontWeight: 600, fontSize: 15 }}>
                Qui peut voir votre videopitch
              </h2>
              <p className={formStyles.hint}>
                Par défaut, votre videopitch est visible de tous les membres. Vous pouvez le
                réserver à certains talents en décochant les autres. Votre fiche projet reste
                visible de tous car elle contient très peu d&apos;informations.
              </p>
              <form action={choisirVisibilite} style={{ marginTop: 12 }}>
                <input type="hidden" name="project_id" value={project.id} />
                <div
                  style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "6px 16px" }}
                >
                  {(metiers ?? []).map((m) => (
                    <label key={m.slug} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        name="metier"
                        value={m.slug}
                        defaultChecked={!project.visible_pour || project.visible_pour.includes(m.slug)}
                      />
                      {m.label_fr}
                    </label>
                  ))}
                </div>
                <button type="submit" className={formStyles.submit} style={{ marginTop: 14 }}>
                  Enregistrer
                </button>
              </form>
            </>
          )}

          <h2 style={{ marginTop: 40, fontWeight: 600, fontSize: 15 }}>
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

        </>
      )}

      {/* Contacter l'auteur : plus de formulaire sur la fiche (26/09), un
          bouton qui mène à l'onglet Messages, le projet déjà indiqué. */}
      {!isOwner && (
        <p style={{ marginTop: 40 }}>
          <Link
            href={user ? `/mes-messages/nouveau?projet=${project.id}` : `/connexion?next=/projet/${project.id}`}
            className={formStyles.submit}
            style={{ display: "inline-block" }}
          >
            Contacter l&apos;auteur
          </Link>
        </p>
      )}

    </PageShell>
  );
}

