import AjouterUnTalent from "./AjouterUnTalent";
import BandeauFichesANoter from "@/components/BandeauFichesANoter";
import BandeauEnregistre from "@/components/BandeauEnregistre";
import { ordonnerPersonnages } from "./ordre-personnages";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { langueDuCookie } from "@/lib/langue-cookie";
import { notFound, redirect } from "next/navigation";
import LabelWFG from "@/components/LabelWFG";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import PartageProjet from "./PartageProjet";
import { choisirVisibilite, setShareLink } from "./actions";
import labelStyles from "./label.module.css";
import CadreEquipe, { type MembreEquipe } from "./CadreEquipe";
import { prendreLaPlace } from "@/app/admin/profils/prise-de-place";
import LibelleSelection, { LignePartenariats, estPartenaire } from "../LibelleSelection";
import AccrocheProjet from "./AccrocheProjet";
import Surligne from "@/components/Surligne";
import { motsDeRecherche } from "@/app/galaxies/mot-trouve";
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
import { nomDuPays } from "@/lib/pays";
import { lecteurBandeAnnonce } from "@/lib/videopitch";
import BarreGravity, { type EtatGravity } from "./BarreGravity";
import { compterArchives } from "@/lib/archives-lecture";
import { photoNette } from "@/lib/photo";
import { clientCartes, clientProfils, createAdminClient } from "@/lib/supabase/admin";
import { assezDecrit, comedypitchsDuProjet, projetAccepte } from "@/lib/comedypitch";
import { GRAVITY } from "@/lib/gravity-textes";

const FORMATS_LISIBLES: Record<string, string> = {
  long_metrage: "Long métrage",
  court_metrage: "Court métrage",
  serie: "Série",
  immersif_360_vr: "Format immersif (360/VR)",
};
// Formats sans budget ni audience : le court métrage (27/09) et le format immersif 360/VR (09/11, Sarah).
const SANS_BUDGET_NI_AUDIENCE = ["court_metrage", "immersif_360_vr"];

type Project = {
  id: string;
  title: string;
  ancien_titre: string | null;
  tagline: string | null;
  logline: string | null;
  synopsis: string | null;
  format: string | null;
  language: string | null;
  country: string | null;
  status: string;
  bandeau: string | null;
  trailer_url: string | null;
  visible_pour: string[] | null;
  owner_id: string;
  legacy_id: string | null;
  genre_slug: string | null;
  postures: string[] | null;
  techniques: string[] | null;
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
  searchParams: Promise<{ message?: string; enregistre?: string; depuis?: string; personnage?: string; talent?: string; q?: string }>;
}) {
  const { id } = await params;
  const { enregistre, depuis, personnage, message, talent, q } = await searchParams;
  // Venu d'une recherche des Galaxies : les mots cherchés sont en rouge
  // sur la fiche, titre, tagline et résumé (02/11, Sarah).
  const motsCherches = motsDeRecherche(q ?? "").map((m) => m.norme);

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
      "id, title, ancien_titre, tagline, logline, synopsis, format, genre_slug, postures, techniques, budget_range, target_audience, language, country, status, bandeau, trailer_url, visible_pour, owner_id, share_code, legacy_id, has_awards, awards_detail, genre:genres(label_fr)",
    )
    .eq("id", id)
    .maybeSingle<Project>();

  if (!project) {
    // La base ne donne pas ce projet à ce membre (0260). S'il existe et
    // qu'il est dans les Galaxies, c'est qu'il faut une adhésion pour l'ouvrir.
    const { data: existe } = await clientCartes(supabase)
      .from("projects")
      .select("id")
      .eq("id", id)
      .eq("is_public", true)
      .maybeSingle();
    if (!existe) notFound();
    return (
      <PageShell title="Galaxies" nav="pitchotheque" connecte>
        <p className={formStyles.hint}>
          <Link href="/adhesion">{GRAVITY.sansAdhesion}</Link>
        </p>
      </PageShell>
    );
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

  // Les fiches héritées de l'ancienne plateforme gardent leurs textes, même
  // au-delà des 300/600 caractères de WFG 2 ; l'encadré qui l'expliquait à
  // l'auteur a été retiré (Sarah, 10/11 : « l'auteur comprendra tout seul »).

  const entetes = await headers();
  const hote = entetes.get("host") ?? "localhost:3000";
  const origine = `${hote.startsWith("localhost") ? "http" : "https"}://${hote}`;

  const { data: characters } = await supabase
    .from("characters")
    .select("id, name, actor_name, photo_path, photo_x, photo_y, photo_proposee, character_type, gender, age_range, biography, legacy_id, created_at")
    .eq("project_id", id)
    // L'ordre est fait ensuite par ordonnerPersonnages (principaux, comédien
    // associé, femmes / photo et description, ordre de WFG 1).
    .returns<
      {
        id: string;
        name: string;
        actor_name: string | null;
        legacy_id: number | null;
        created_at: string;
        photo_path: string | null;
        photo_x: number;
        photo_y: number;
        photo_proposee: boolean;
        character_type: string | null;
        gender: string | null;
        age_range: string | null;
        biography: string | null;
      }[]
    >();

  const { data: estAdmin } = await supabase.rpc("is_admin");

  // Une fiche ouverte est une vue (03/10) : une fois par membre et par projet,
  // l'équipe comptée ; la base écarte l'auteur, l'administration et les lecteurs.
  // Le nombre de vues n'est donné qu'à l'auteur et à l'administration.
  if (!isOwner) await supabase.rpc("enregistrer_vue", { p_projet: id });
  const { data: nbVues } =
    isOwner || estAdmin ? await supabase.rpc("compter_vues", { p_projet: id }) : { data: null };
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
  // Autant de photos qu'on veut (14/10, Sarah ; neuf au plus avant), on
  // les affiche toutes, le cadre défile.
  const moodboard = (fichiers ?? []).filter((f) => f.kind === "moodboard");
  const urls = await signerImages(supabase, [
    vignette?.storage_path,
    ...moodboard.map((m) => m.storage_path),
    ...(characters ?? []).map((c) => c.photo_path),
  ]);
  const urlVignette = vignette ? (urls.get(vignette.storage_path) ?? null) : null;

  const etatFiche = {
    titre: project.title,
    tagline: project.tagline,
    logline: project.logline,
    genre: project.genre_slug,
    format: project.format,
    aUneVignette: !!vignette,
    aUnScenario: (fichiers ?? []).some((f) => f.kind === "scenario"),
    nombrePersonnages: (characters ?? []).length,
  };
  const taux = tauxDeRemplissage(etatFiche);
  const aFaire = prochaineAction(etatFiche);
  const etatBlocs = isOwner || estAdmin ? await etatDesBlocs(supabase, id) : null;
  // Le scénario depuis la barre Admin (02/11, Sarah : « tellement plus
  // rapide » que de passer par l'écran des membres) : lien signé une heure,
  // ouvert dans un nouvel onglet (pas de téléchargement, son choix).
  const scenario = (fichiers ?? []).filter((f) => f.kind === "scenario").at(-1) ?? null;
  const urlScenario =
    estAdmin === true && scenario
      ? (await supabase.storage.from("scenarios").createSignedUrl(scenario.storage_path, 60 * 60)).data?.signedUrl ?? null
      : null;
  // Les fiches de lecture (héritées et publiées) : la base ne les rend
  // qu'à l'auteur et à l'administration. Un bouton y mène s'il y en a.
  const fiches = isOwner || estAdmin ? await chargerFiches(supabase, id) : [];
  // Les archives de lecture : l'administration seulement, même si elle est l'auteur.
  const nbArchives = estAdmin === true ? await compterArchives(id) : 0;
  const prochainBloc = etatBlocs ? (BLOCS.find((b) => !etatBlocs.fait[b.cle]) ?? null) : null;

  const { data: auteur } = await clientProfils(supabase)
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
  // Un talent repris de WFG 1 par son adresse (0166, 19/10) a un profil
  // vide, sans nom : la base ne le compte pas dans l'équipe tant qu'il ne
  // s'est pas inscrit, mais la carte des Galaxies le montre (lettre du
  // métier). Ici, il apparaît « Pas encore inscrit » (Sarah, 08/11/2026).
  if (isOwner || estAdmin) {
    for (const t of talents ?? []) {
      if (t.status === "accepte" && t.profile_id && equipe.some((m) => m.profileId === t.profile_id)) continue;
      if (t.status === "refuse") continue;
      equipe.push({
        cle: t.id,
        profileId: t.profile_id,
        nom: t.invited_email,
        role: t.role?.label_fr ?? null,
        enAttente: t.profile_id && t.status !== "accepte" ? "Invitation envoyée" : "Pas encore inscrit",
      });
    }
  }

  // Sans adhésion (02/10, décision de Sarah) : pas de videopitch, pas de
  // message à l'auteur, pas de noms ni de liens vers les profils, et les
  // photos de l'équipe floutées. L'auteur, son équipe, l'administration
  // et les adhérents voient tout.
  const dansEquipe = !!user && equipe.some((m) => m.profileId === user.id && !m.enAttente);
  const { data: adherent } = user
    ? await supabase.rpc("a_une_adhesion_active", { p_profile_id: user.id })
    : { data: false };
  // Depuis le 12/11 : ce n'est plus l'adhésion qui ouvre tout, mais le
  // Gravity dépensé sur CE projet (règle du 11/11 : 1 projet par jour, et
  // pour lui « tout s'ouvre »). La base applique la même règle.
  const { data: ouverture } = user
    ? await supabase
        .from("gravity_ouvertures")
        .select("ouvert_le")
        .eq("profile_id", user.id)
        .eq("project_id", id)
        .maybeSingle<{ ouvert_le: string }>()
    : { data: null };
  const chezSoi = isOwner || estAdmin === true || dansEquipe;
  const restreint = !chezSoi && !ouverture;
  // Sans adhésion, la fiche ne s'ouvre pas (12/11, Sarah) : on ne voit des
  // projets que leur carte. Rien de la fiche ne part vers le navigateur.
  // Exception (13/11, Sarah) : la fiche du CinéCrush de la semaine s'ouvre à
  // tous les membres — c'est là que les comédiens déposent leur ComedyPitch.
  // Elle reste « restreinte » (videopitch, noms de l'équipe) sans soleil.
  const service = createAdminClient();
  const reglesComedy = service
    ? await projetAccepte(service, { id: project.id, owner_id: project.owner_id })
    : { cinecrush: false, accepte: false };
  if (!chezSoi && !ouverture && adherent !== true && !reglesComedy.cinecrush) {
    return (
      <PageShell title="Galaxies" nav="pitchotheque" connecte>
        <p className={formStyles.hint}>
          <Link href="/adhesion">{GRAVITY.sansAdhesion}</Link>
        </p>
      </PageShell>
    );
  }
  let gravity: EtatGravity | null = null;
  let favori: boolean | null = null;
  if (user && !chezSoi) {
    if (ouverture) gravity = { etat: "ouvert", le: ouverture.ouvert_le };
    else if (adherent !== true) gravity = { etat: "sans_adhesion" };
    else {
      const { data: dispo } = await supabase.rpc("gravity_du_jour_disponible");
      gravity = dispo === true ? { etat: "disponible" } : { etat: "utilise" };
    }
    if (adherent === true) {
      const { data: f } = await supabase.from("favoris").select("project_id").eq("profile_id", user.id).eq("project_id", id).maybeSingle();
      favori = !!f;
    }
  }
  // Chaque membre de l'équipe a son enveloppe (14/10, Sarah : tous les
  // talents sont contactables), dans le panneau de sa biographie, à côté du
  // drapeau. Le porteur par le projet, les autres par leur profil. Pas pour
  // soi-même. Messagerie fermée (08/10) : l'enveloppe est barrée.
  const fermees = new Map<string, string>();
  if (!restreint && user) {
    const ids = equipe.map((m) => m.profileId).filter((x): x is string => !!x && x !== user.id);
    const reponses = await Promise.all(ids.map((uid) => supabase.rpc("messagerie_fermee", { uid })));
    const idsFermes = ids.filter((_, i) => reponses[i].data === true);
    if (idsFermes.length) {
      const { data: prenoms } = await clientProfils(supabase).from("profiles").select("id, first_name").in("id", idsFermes);
      for (const pr of prenoms ?? []) {
        fermees.set(pr.id as string, `${(pr.first_name as string | null) ?? "Ce talent"} est indisponible momentanément, messagerie saturée.`);
      }
    }
  }
  for (const m of equipe) {
    if (m.enAttente || !m.profileId || m.profileId === user?.id) continue;
    const cible = m.cle === project.owner_id ? `projet=${project.id}` : `membre=${m.profileId}`;
    m.contact = {
      href: user ? `/mes-messages/nouveau?${cible}` : `/connexion?next=/projet/${project.id}`,
      adhesionRequise: restreint,
      // Adhérent qui n'a pas ouvert le projet : la bulle parle du Gravity, pas de l'adhésion.
      gravityRequis: restreint && adherent === true,
      indisponible: fermees.get(m.profileId),
    };
  }

  // Le ComedyPitch (13/11) : quels personnages en attendent un, qui peut en
  // déposer, qui les regarde — règles dans src/lib/comedypitch.ts.
  const voitComedyPitchs = !!user && (!restreint || reglesComedy.cinecrush);
  const comedyEnLigne = voitComedyPitchs && user ? await comedypitchsDuProjet(project.id, user.id) : [];
  let comedienPeutDeposer = false;
  if (user && service && reglesComedy.accepte && (ouverture || reglesComedy.cinecrush)) {
    const { data: comedien } = await service
      .from("profile_roles")
      .select("role_slug")
      .eq("profile_id", user.id)
      .eq("role_slug", "comedien")
      .maybeSingle();
    comedienPeutDeposer = !!comedien;
  }
  // Pour l'auteur : les ComedyPitchs mis en ligne qu'il n'a pas encore vus.
  // Arriver sur le personnage par « Le regarder » les marque comme vus.
  let nouveauxComedyPitchs: { id: string; personnageId: string; prenom: string }[] = [];
  if (isOwner && service) {
    const { data: nonVus } = await service
      .from("videopitch_depots")
      .select("id, personnage_id")
      .eq("project_id", project.id)
      .eq("genre", "comedypitch")
      .eq("etat", "valide")
      .is("vu_par_auteur_le", null)
      .returns<{ id: string; personnage_id: string }[]>();
    const regardes = (nonVus ?? []).filter((d) => d.personnage_id === personnage);
    if (regardes.length) {
      await service.from("videopitch_depots").update({ vu_par_auteur_le: new Date().toISOString() }).in("id", regardes.map((d) => d.id));
    }
    nouveauxComedyPitchs = (nonVus ?? [])
      .filter((d) => d.personnage_id !== personnage)
      .map((d) => ({ id: d.id, personnageId: d.personnage_id, prenom: comedyEnLigne.find((v) => v.id === d.id)?.prenom ?? "" }));
  }

  // La phrase d'encouragement des lecteurs, pour un projet labellisé.
  const { data: avisWfg } = await supabase.rpc("avis_wfg_projet", { p_project_id: id });

  // Les photos de l'équipe, pour le côté « L'auteur » du cadre.
  const idsEquipe = equipe.map((m) => m.profileId).filter((x): x is string => !!x);
  if (idsEquipe.length) {
    const { data: photos } = await clientProfils(supabase)
      .from("profiles")
      .select("id, avatar_url, country")
      .in("id", idsEquipe);
    const parId = new Map(
      (photos ?? []).map((ph) => [
        ph.id as string,
        ph as { avatar_url: string | null; country: string | null },
      ]),
    );
    for (const m of equipe) {
      const fiche = m.profileId ? parId.get(m.profileId) : undefined;
      const photo = fiche?.avatar_url ?? null;
      m.photo = restreint && photo ? `/api/talents/photo?id=${m.profileId}` : photoNette(photo);
      // Où la personne vit (12/10, Sarah) : drapeau + « Afrique du Sud »,
      // pour qu'un crédit dépensé pour écrire le soit en connaissance de
      // cause. Le pays du profil est celui où l'on vit, pas l'origine. Sans
      // la ville (14/10, Sarah : « pas nécessaire »).
      const code = fiche?.country?.trim().toLowerCase() ?? "";
      const pays = /^[a-z]{2}$/.test(code) ? nomDuPays(code) : null;
      m.lieu = pays ? { code, texte: pays } : null;
    }
    // Les langues parlées, sous le métier (12/10, Sarah) : pour ne pas
    // écrire en anglais à un auteur qui ne le parle pas. Dans l'ordre de la
    // liste du profil (français, anglais, espagnol…).
    const { data: languesBrut } = await supabase
      .from("profile_languages")
      .select("profile_id, langue:languages(label_fr, position)")
      .in("profile_id", idsEquipe);
    const languesPar = new Map<string, { label_fr: string; position: number }[]>();
    for (const l of (languesBrut ?? []) as unknown as {
      profile_id: string;
      langue: { label_fr: string; position: number } | null;
    }[]) {
      if (!l.langue) continue;
      languesPar.set(l.profile_id, [...(languesPar.get(l.profile_id) ?? []), l.langue]);
    }
    for (const m of equipe) {
      const noms = (m.profileId ? (languesPar.get(m.profileId) ?? []) : [])
        .sort((x, y) => x.position - y.position)
        .map((l, i) => (i === 0 ? l.label_fr : l.label_fr.toLowerCase()));
      m.langues = noms.length ? noms.join(", ") : null;
    }
    // Biographie et site, dépliés au clic sur le portrait (03/10, décision
    // de Sarah) : pour l'administration, le membre lui-même, l'équipe et les
    // adhérents — jamais pour qui n'a pas d'adhésion, dont la base n'est
    // même pas interrogée.
    if (!restreint) {
      const { data: details } = await clientProfils(supabase)
        .from("profiles")
        .select("id, biofilmo, website")
        .in("id", idsEquipe);
      const parIdDetail = new Map(
        (details ?? []).map((d) => [d.id as string, d as { biofilmo: string | null; website: string | null }]),
      );
      for (const m of equipe) {
        const d = m.profileId ? parIdDetail.get(m.profileId) : null;
        // Pour l'administration, le portrait mène tout droit au profil du
        // membre (06/11, Sarah : y poser un téléphone sans se mettre à sa
        // place) ; la biographie se lit là-bas.
        if (!m.enAttente && m.profileId && estAdmin !== true) {
          m.deplie = true;
          m.bio = d?.biofilmo ?? null;
          m.site = d?.website ?? null;
        }
      }
    }
  }
  if (restreint) {
    for (const m of equipe) {
      m.nom = "";
      m.profileId = null;
    }
  }

  // Les videopitchs sont dans une table à part, sous verrou (migration
  // 0125) : la base ne les rend qu'à l'auteur, son équipe, l'administration
  // et les adhérents. Pour les autres, rien ne revient.
  const { data: videopitch } = await supabase
    .from("project_videopitchs")
    .select("videopitch_fr, videopitch_en")
    .eq("project_id", id)
    .maybeSingle<{ videopitch_fr: string | null; videopitch_en: string | null }>();

  // Les sous-genres (04/11), écrits après la famille sous le titre.
  const { data: sousGenres } = await supabase
    .from("project_sous_genres")
    .select("sous_genre:sous_genres(label_fr)")
    .eq("project_id", project.id)
    .order("position")
    .returns<{ sous_genre: { label_fr: string } | null }[]>();
  const { data: motsCles } = await supabase
    .from("project_keywords")
    .select("source, keyword:keywords(label_fr, label_en)")
    .eq("project_id", id)
    .returns<{ source: string | null; keyword: { label_fr: string; label_en: string | null } | null }[]>();
  // Globe sur l'anglais : les mots-clés traduits s'écrivent en anglais (08/11).
  const enAnglais = langueDuCookie((await cookies()).get("googtrans")?.value) === "en";

  return (
    <PageShell
      title={<Surligne texte={project.title} mots={motsCherches} />}
      apresTitre={
        project.status === "labellise" ? (
          // Comme le © d'un copyright : le label, en exposant du titre.
          <span className={labelStyles.exposant}>
            <LabelWFG hauteur={30} sansFond />
          </span>
        ) : undefined
      }
    >
      {enregistre && <BandeauEnregistre />}
      {message === "envoye" && <p className={profilStyles.ok}>Message envoyé.</p>}
      {/* La fiche de lecture pas encore notée par l'auteur (04/11) : le bandeau reste. */}
      {isOwner && <BandeauFichesANoter retour={`/projet/${project.id}`} projetId={project.id} />}

      {/* Sous le titre, sur une seule ligne : genre, format, langue, budget,
          audience, puis, pour l'admin seulement, les mots-clés — écrits
          comme du texte, pas en boutons : ils ne sont pas cliquables. Un
          mot-clé qui répète le genre (« drame ») n'est pas écrit deux fois. */}
      <p className={formStyles.hint}>
        {(() => {
          const reperes = [
            project.genre?.label_fr,
            ...(sousGenres ?? []).map((s) => s.sous_genre?.label_fr),
            // Fiction et prise de vues réelles vont de soi : seuls les autres choix s'écrivent.
            project.postures?.includes("documentaire") ? "Documentaire" : null,
            project.techniques?.includes("animation") ? "Animation" : null,
            project.techniques?.includes("contenu_ia") ? "Contenu IA" : null,
            project.techniques?.includes("medias_mixtes") ? "Contenus hybrides" : null,
            project.techniques?.includes("formats_immersifs") ? "Formats immersifs (360/VR)" : null,
            FORMATS_LISIBLES[project.format ?? ""] ?? project.format,
            nomDeLangue(project.language),
            // Pas de budget ni d'audience pour un court métrage (27/09).
            !SANS_BUDGET_NI_AUDIENCE.includes(project.format ?? "") && project.budget_range ? BUDGET_LISIBLE[project.budget_range] : null,
            !SANS_BUDGET_NI_AUDIENCE.includes(project.format ?? "") && project.target_audience ? AUDIENCE_LISIBLE[project.target_audience] : null,
          ].filter((x): x is string => Boolean(x));
          // Les mots-clés servent à la recherche, en coulisse : seule
          // l'admin les voit tous ici, pour comprendre pourquoi un projet
          // sort dans une recherche (01/10). L'auteur voit les siens, ceux
          // qu'il a choisis sous la logline (07/11, Sarah).
          if (!estAdmin && !isOwner) return reperes.join(" · ");
          const deja = new Set(reperes.map((r) => r.toLowerCase()));
          const mots = (motsCles ?? [])
            .filter((m) => estAdmin || m.source === "demande_auteur")
            .filter((m) => m.keyword && !deja.has(m.keyword.label_fr.toLowerCase()))
            .map((m) => (enAnglais && m.keyword!.label_en) || m.keyword!.label_fr);
          // Venue d'une recherche, l'admin voit en rouge le mot-clé qui a
          // fait sortir le projet (02/11, Sarah).
          return [...reperes, ...mots].map((x, i) => (
            <span key={i}>
              {i > 0 && " · "}
              <Surligne texte={x} mots={motsCherches} />
            </span>
          ));
        })()}
      </p>
      {/* Un projet renommé garde son titre d'origine (01/11, Sarah). */}
      {project.ancien_titre && <p className={formStyles.hint}>Ancien titre : {project.ancien_titre}</p>}
      {/* La tagline sous le titre, le résumé sur demande (14/10, Sarah). */}
      <AccrocheProjet tagline={project.tagline} logline={project.logline} plus={project.synopsis} mots={motsCherches} />
      {/* Les partenariats (Muse Awards…) sous le titre, en rouge, pour qu'on
          les voie avant tout le reste (14/10, Sarah). */}
      <LignePartenariats libelles={(selections ?? []).map((x) => x.libelle)} />
      {typeof nbVues === "number" && (
        <p className={formStyles.hint}>
          {nbVues} vue{nbVues > 1 ? "s" : ""}
        </p>
      )}

      {/* Raccourcis de l'administration (30/10, Sarah) : corriger la fiche
          d'un membre depuis la Galaxie, sans passer par l'admin. Les blocs
          de saisie s'ouvrent pour l'administration (chargerProjetAModifier). */}
      {estAdmin === true && !isOwner && (
        <div className={presentation.barreAdmin}>
          <span>Admin :</span>
          {BLOCS.map((b) => (
            <Link key={b.cle} href={hrefBloc(project.id, b.cle)}>
              {b.titre}
            </Link>
          ))}
          <form action={prendreLaPlace}>
            <input type="hidden" name="profile_id" value={project.owner_id} />
            <input type="hidden" name="retour" value={`/projet/${project.id}`} />
            <button type="submit">Se mettre à la place de l&apos;auteur</button>
          </form>
          <Link href={`/membres/${project.owner_id}`}>Profil de l&apos;auteur</Link>
          {urlScenario && (
            <a href={urlScenario} target="_blank" rel="noopener noreferrer" className={presentation.telechargerScenario}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
                <path d="M12 18v-6" />
                <path d="m9 15 3 3 3-3" />
              </svg>
              Ouvrir le scénario
            </a>
          )}
        </div>
      )}

      {nouveauxComedyPitchs.map((n) => (
        <p key={n.id} className={formStyles.hint} style={{ color: "inherit" }}>
          {n.prenom} a déposé un ComedyPitch pour votre personnage {(characters ?? []).find((c) => c.id === n.personnageId)?.name ?? ""}.{" "}
          <Link href={`/projet/${project.id}?personnage=${n.personnageId}#personnages`}>Le regarder</Link>
        </p>
      ))}
      {gravity && <BarreGravity projetId={project.id} gravity={gravity} favori={favori} />}
      {/* L'image de présentation est dans le cadre, côté « La fiche ». */}
      <CadreEquipe
        admin={estAdmin === true ? { projetId: project.id } : null}
        // La tagline et le résumé sont revenus sous le titre (14/10, Sarah).
        porteur={project.owner_id}
        retourSaisie={
          isOwner || estAdmin
            ? hrefBloc(id, BLOCS.find((b) => b.cle === depuis)?.cle ?? "fiche")
            : null
        }
        equipe={equipe}
        personnageOuvert={personnage ?? null}
        personnages={ordonnerPersonnages(characters ?? []).map((c) => ({
          id: c.id,
          nom: c.name,
          portrait: c.photo_path ? (urls.get(c.photo_path) ?? null) : null,
          cadrage: `${c.photo_x}% ${c.photo_y}%`,
          proposee: c.photo_proposee && Boolean(c.photo_path),
          infos: [
            PERSONNAGE_LISIBLE[c.character_type ?? ""],
            PERSONNAGE_LISIBLE[c.gender ?? ""],
            PERSONNAGE_LISIBLE[c.age_range ?? ""],
          ]
            .filter(Boolean)
            .join(" · "),
          bio: c.biography,
          comedypitch: (() => {
            const attend = reglesComedy.accepte && assezDecrit(c.biography, reglesComedy.cinecrush);
            return {
              attend,
              deposer: estAdmin === true || (comedienPeutDeposer && attend) ? `/projet/${project.id}/comedypitch/${c.id}` : null,
              videos: comedyEnLigne
                .filter((v) => v.personnageId === c.id)
                .map((v) => ({ id: v.id, prenom: v.prenom, vimeoId: v.vimeoId, etoiles: v.etoiles, donnee: v.donnee, peutEtoiler: v.comedienId !== user?.id })),
            };
          })(),
        }))}
        moodboard={moodboard.map((m) => urls.get(m.storage_path)).filter((u): u is string => Boolean(u))}
        image={urlVignette ?? null}
        bandeau={project.bandeau ?? null}
        avis={(avisWfg as string | null) ?? null}
        videopitch={
          // Pendant sa semaine de CinéCrush, le videopitch s'ouvre à tous (13/11,
          // Sarah : le comédien doit savoir de quelle histoire il s'agit).
          (!restreint || reglesComedy.cinecrush) && videopitchVisible && (videopitch?.videopitch_fr || videopitch?.videopitch_en)
            ? { fr: videopitch.videopitch_fr, en: videopitch.videopitch_en, titre: project.title }
            : undefined
        }
        bandeAnnonce={project.bandeau === "tourne" ? lecteurBandeAnnonce(project.trailer_url) : null}
        langueProjet={project.language}
      />
      {(isOwner || estAdmin) && <AjouterUnTalent projectId={id} resultat={talent} />}

      {/* Sous le cadre : les prix — puis les sélections et comédiens repris
          de WFG 1, en petit (28/09 : page allégée à la demande de Sarah).
          Les partenariats, eux, sont sous le titre (14/10). */}
      {(() => {
        const selectionsMaison = (selections ?? []).filter((x) => !estPartenaire(x.libelle));
        if (!project.has_awards && selectionsMaison.length === 0) return null;
        return (
          <p className={presentation.prix}>
            <strong>Projet primé</strong>
            {selectionsMaison.map((x) => (
              <span key={x.libelle} style={{ display: "block" }}>
                <LibelleSelection libelle={x.libelle} />
              </span>
            ))}
            {project.awards_detail}
          </p>
        );
      })()}
      {(comediens ?? []).length > 0 && (
        <p className={formStyles.hint} style={{ marginTop: 12 }}>
          {(comediens ?? []).length > 0 && (
            <>Comédien·ne·s envisagé·e·s : {(comediens ?? []).map((c) => c.libelle).join(" · ")}</>
          )}
        </p>
      )}

      {/* « Analyse du projet » (10/11, Sarah) : une seule zone sous le cadre
          qui suit le projet du dépôt à l'analyse, et porte le bouton vers
          les analyses quand elles sont là — à la place du bouton
          « Fiches de lecture » isolé d'avant (26/09). L'auteur et
          l'administration seulement. Une fiche héritée de WFG 1 sans suivi
          de lecture s'affiche directement « Analyse disponible ». */}
      {/* Les archives de la Maison (Cannes 2016…) comptent pour
          l'administration seulement : elles sont dans la même page, sous
          « ARCHIVE », jamais montrées à l'auteur (31/10, Sarah). */}
      {(isOwner || estAdmin) &&
        (() => {
          const nombre = fiches.length + nbArchives;
          if (!etatLecture && nombre === 0) return null;
          return (
            <EtatDeLecture
              etat={etatLecture?.etat ?? "disponible"}
              deposeLe={etatLecture?.depose_le ?? null}
              analyses={
                nombre > 0
                  ? { href: `/projet/${project.id}/fiches${q ? `?q=${encodeURIComponent(q)}` : ""}`, nombre }
                  : null
              }
            />
          );
        })()}

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
              placée dans les Galaxies, et elle donne une bonne image de
              votre travail.
            </p>
          )}
          {aFaire && (
            <p className={formStyles.hint} style={{ margin: "8px 0 0" }}>
              Les fiches complètes apparaissent plus haut dans les Galaxies.
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

    </PageShell>
  );
}

