import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Bandeau from "@/components/Bandeau";
import LogoComplet from "@/components/LogoComplet";
import VignetteEau from "@/components/VignetteEau";
import ContactEnveloppe from "@/app/projet/[id]/ContactEnveloppe";
import projetsStyles from "@/app/galaxies/projets.module.css";
import EquipeCarte from "@/components/EquipeCarte";
import PersonnagesCarte from "@/components/PersonnagesCarte";
import { equipesDesCartes, lectureRestreinte } from "@/app/galaxies/equipe-carte";
import { SELECTION_PERSONNAGES, cheminsPortraits, personnagesDeLaCarte, type PersonnageBrut } from "@/app/galaxies/personnages-carte";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import presentation from "@/app/projet/[id]/presentation.module.css";
import { prendreLaPlace } from "@/app/admin/profils/prise-de-place";
import ChampPhoto from "@/app/profil/identite/ChampPhoto";
import { urlOriginal } from "@/app/profil/identite/original";
import profilStyles from "@/app/profil/profil.module.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import ChangerAdresseMembre from "@/app/admin/membres/ChangerAdresseMembre";
import ChangerTelephoneMembre from "@/app/admin/membres/ChangerTelephoneMembre";
import styles from "./membre.module.css";
import { photoNette } from "@/lib/photo";

type Membre = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  biofilmo: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  avatar_url: string | null;
  avatar_original_path: string | null;
  photo_x: number | null;
  photo_y: number | null;
};

/**
 * Le profil d'un autre membre.
 *
 * Réservé aux membres connectés, comme l'annuaire : les profils ne sont
 * pas publics. Le profil d'un lecteur n'est vu que de lui-même et de
 * l'administration : un auteur n'en connaît que le prénom, et ne doit pas
 * pouvoir le retrouver par ici.
 *
 * Comme dans la Galaxie de Talents (02/10, décision de Sarah) : pour un
 * autre membre, pas de nom, pas de site, pas de biographie (elle cite
 * souvent le nom), et la photo floutée dans l'image elle-même. Le membre lui-même et l'administration voient tout.
 */
export default async function ProfilMembrePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string; erreur?: string; photo?: string; cadrage?: string }>;
}) {
  const { id } = await params;
  const { message, erreur, photo, cadrage } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/membres/${id}`);

  const { data: membre } = await supabase
    .from("profiles")
    .select("id, full_name, display_name, biofilmo, website, avatar_url, avatar_original_path, photo_x, photo_y")
    .eq("id", id)
    .maybeSingle<Membre>();

  if (!membre) notFound();

  let masque = false;
  let estAdmin = false;
  if (membre.id !== user.id) {
    const [{ data: lecteur }, { data: isAdmin }] = await Promise.all([
      supabase
        .from("profile_roles")
        .select("role_slug")
        .eq("profile_id", membre.id)
        .eq("role_slug", "lecteur")
        .maybeSingle(),
      supabase.rpc("is_admin"),
    ]);
    if (lecteur && !isAdmin) notFound();
    masque = isAdmin !== true;
    estAdmin = isAdmin === true;
  }

  // Pour l'administration (06/11, Sarah) : l'email et le téléphone du
  // membre, à corriger ici sans se mettre à sa place. Le téléphone est
  // celui du formulaire « Qui êtes-vous ? », sinon celui des coordonnées
  // de dépôt, comme dans l'écran des membres.
  let coordonnees: { email: string | null; telephone: string | null } | null = null;
  if (estAdmin) {
    const service = createAdminClient();
    if (service) {
      const [{ data: compte }, { data: prive }, { data: contact }] = await Promise.all([
        service.auth.admin.getUserById(membre.id),
        service.from("profile_private_details").select("phone").eq("profile_id", membre.id).maybeSingle(),
        service.from("profile_contact_info").select("phone").eq("profile_id", membre.id).maybeSingle(),
      ]);
      const email = compte.user?.email ?? null;
      coordonnees = {
        email: email && email.endsWith("@sans-adresse.invalid") ? null : email,
        telephone: prive?.phone?.trim() || contact?.phone?.trim() || null,
      };
    }
  }

  // Tous les projets de l'auteur (07/10, Sarah : un producteur doit voir tout
  // ce que l'auteur a en développement). Mêmes règles que les Galaxies :
  // projets visibles des membres, et pas d'image, pas de carte.
  const { data: projetsBruts } = await supabase
    .from("projects")
    .select(`id, title, tagline, status, bandeau, genre:genres(label_fr), files:project_files(storage_path, kind), ${SELECTION_PERSONNAGES}`)
    .eq("owner_id", membre.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .returns<
      {
        id: string;
        title: string;
        tagline: string | null;
        status: string;
        bandeau: string | null;
        genre: { label_fr: string } | null;
        files: { storage_path: string; kind: string }[];
        characters: PersonnageBrut[] | null;
      }[]
    >();
  const vignetteChemin = (p: { files: { storage_path: string; kind: string }[] }) =>
    p.files.find((f) => f.kind === "vignette")?.storage_path ?? null;
  const projets = (projetsBruts ?? []).filter((p) => vignetteChemin(p));
  const { data: signes } = projets.length
    ? await supabase.storage
        .from("project-media")
        .createSignedUrls(
          projets.flatMap((p) => [vignetteChemin(p) as string, ...cheminsPortraits(p.characters)]),
          60 * 60,
        )
    : { data: [] };
  const urlDe = new Map((signes ?? []).map((s) => [s.path, s.signedUrl]));
  // Les talents déjà rattachés et les personnages, sous chaque projet (19/10,
  // Sarah : un producteur choisit avant de dépenser un crédit).
  const equipes = await equipesDesCartes(supabase, projets.map((p) => p.id), await lectureRestreinte(supabase, user.id));

  // L'enveloppe (10/10, Sarah) : on écrit à un talent depuis son profil, sans
  // passer par un projet ; le message porte un objet. Comme sur la fiche d'un
  // projet : barrée sans adhésion, barrée si sa messagerie est fermée, libre
  // pour l'administration. Un cinéphile ou un lecteur n'a pas d'enveloppe.
  const peutEcrire = membre.id !== user.id;
  let adherent = false;
  let indisponible: string | undefined;
  if (peutEcrire) {
    const [{ data: a }, { data: fermee }] = await Promise.all([
      supabase.rpc("a_une_adhesion_active", { p_profile_id: user.id }),
      supabase.rpc("messagerie_fermee", { uid: membre.id }),
    ]);
    adherent = a === true;
    if (fermee === true && (adherent || estAdmin)) {
      indisponible = `${(await supabase.from("profiles").select("first_name").eq("id", membre.id).maybeSingle<{ first_name: string | null }>()).data?.first_name ?? "Ce talent"} est indisponible momentanément, messagerie saturée.`;
    }
  }
  const enveloppe = peutEcrire ? (
    <div style={{ marginTop: 16 }}>
      {message === "envoye" && <p className={formStyles.hint}>Message envoyé.</p>}
      <ContactEnveloppe
        href={`/mes-messages/nouveau?membre=${membre.id}`}
        adhesionRequise={!estAdmin && !adherent}
        indisponible={indisponible}
      />
    </div>
  ) : null;

  const nom = masque ? "Membre" : (membre.display_name ?? membre.full_name ?? "Membre");

  return (
    <PageShell eyebrow="Membre" title={nom}>
      {/* La photo, ronde comme le logo. Sans photo, l'initiale. L'administration
          la pose, la recadre ou la retire ici même (05/11, Sarah). */}
      {estAdmin ? (
        <>
          {photo && <p className={profilStyles.ok}>Photo enregistrée.</p>}
          {cadrage && <p className={profilStyles.ok}>Cadrage enregistré.</p>}
          {erreur && <p className={formStyles.error}>{erreur}</p>}
          <ChampPhoto
            membre={membre.id}
            photo={photoNette(membre.avatar_url)}
            original={urlOriginal(supabase, membre.avatar_original_path)}
            x={membre.photo_x ?? 50}
            y={membre.photo_y ?? 20}
            initiale={nom.trim().charAt(0).toUpperCase()}
          />
        </>
      ) : (
        <div className={styles.photo} aria-hidden="true">
          {membre.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={masque ? `/api/talents/photo?id=${membre.id}` : (photoNette(membre.avatar_url) ?? undefined)} alt="" />
          ) : (
            !masque && <span>{nom.trim().charAt(0).toUpperCase()}</span>
          )}
        </div>
      )}

      {/* Accès rapide de l'administration (05/11, Sarah) : se mettre à la
          place du talent sans passer par l'écran des membres, long à
          ouvrir ; on arrive sur sa page « Qui êtes-vous ? » (sa photo). */}
      {estAdmin && (
        <div className={presentation.barreAdmin}>
          <span>Admin :</span>
          <form action={prendreLaPlace}>
            <input type="hidden" name="profile_id" value={membre.id} />
            <input type="hidden" name="retour" value="/profil/identite" />
            <button type="submit">Se mettre à sa place</button>
          </form>
          {coordonnees && (
            <>
              <ChangerAdresseMembre profileId={membre.id} email={coordonnees.email} />
              <ChangerTelephoneMembre profileId={membre.id} telephone={coordonnees.telephone} />
            </>
          )}
        </div>
      )}

      {enveloppe}

      {masque ? null : membre.biofilmo ? (
        <p style={{ marginTop: 24, whiteSpace: "pre-wrap" }}>{membre.biofilmo}</p>
      ) : (
        <p className={formStyles.hint} style={{ marginTop: 24 }}>
          Ce membre n&apos;a pas encore rédigé sa biographie.
        </p>
      )}

      {membre.website && !masque && (
        <p className={formStyles.linkRow} style={{ marginTop: 24 }}>
          <a href={membre.website} target="_blank" rel="noopener noreferrer">
            Son site
          </a>
        </p>
      )}

      {projets.length > 0 && (
        <>
          <h2 style={{ marginTop: 40 }}>
            {projets.length > 1 ? `Ses ${projets.length} projets` : "Son projet"}
          </h2>
          <ul className={projetsStyles.grille} style={{ marginTop: 16 }}>
            {projets.map((p) => {
              const vignette = urlDe.get(vignetteChemin(p) as string);
              return (
                <li key={p.id}>
                  <Link href={`/projet/${p.id}`} className={`${projetsStyles.carte} ${projetsStyles.eau}`}>
                    <div className={projetsStyles.vignette}>
                      <Bandeau valeur={p.bandeau} />
                      {vignette && <VignetteEau src={vignette} />}
                    </div>
                    <div className={projetsStyles.legende}>
                      <strong>
                        {p.title}
                        {p.status === "labellise" && (
                          <span className={projetsStyles.label} title="Projet labellisé WeFilmGood">
                            <LogoComplet hauteur={22} />
                          </span>
                        )}
                      </strong>
                      {p.genre?.label_fr && <span className={projetsStyles.genre}>{p.genre.label_fr}</span>}
                      {p.tagline && <p className={projetsStyles.logline}>{p.tagline}</p>}
                    </div>
                  </Link>
                  <EquipeCarte projetId={p.id} equipe={equipes.get(p.id)} />
                  <PersonnagesCarte projetId={p.id} personnages={personnagesDeLaCarte(p.characters, urlDe)} />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </PageShell>
  );
}
