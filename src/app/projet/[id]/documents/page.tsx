import Link from "next/link";
import formStyles from "@/components/form.module.css";
import ChampFichier from "@/components/ChampFichier";
import profilStyles from "@/app/profil/profil.module.css";
import BlocProjet from "../../BlocProjet";
import { chargerProjetAModifier } from "../../blocs";
import styles from "../../blocs.module.css";
import { signerImages } from "../fichiers";
import { modeHelloAsso, testeurPaiement } from "@/lib/helloasso";
import { basculerAutorisationStoryPitch, enregistrerDocuments } from "./actions";
import BoutonRetirerPhoto from "./BoutonRetirerPhoto";
import ZoneMoodboard from "./ZoneMoodboard";
import ImagePresentation from "./ImagePresentation";
import EnvoiVideopitch, { type DepotAffiche } from "./EnvoiVideopitch";
import VideopitchLecteur from "@/components/VideopitchLecteur";
import { createAdminClient } from "@/lib/supabase/admin";

type Fichier = { id: string; kind: string; storage_path: string; original_name: string | null };

/**
 * Bloc 2 : les documents. L'image de présentation — celle de la
 * pitchothèque —, le Moodboard, qui n'apparaît que sur la fiche, et le
 * scénario en PDF, confidentiel.
 */
export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string; cree?: string; enregistre?: string; paiement?: string }>;
}) {
  const { id } = await params;
  const { erreur, cree, enregistre, paiement } = await searchParams;
  const { supabase, projet, user } = await chargerProjetAModifier(id, "documents");

  const { data: fichiers } = await supabase
    .from("project_files")
    .select("id, kind, storage_path, original_name")
    .eq("project_id", id)
    .order("uploaded_at", { ascending: true })
    .returns<Fichier[]>();

  const vignette = (fichiers ?? []).filter((f) => f.kind === "vignette").at(-1) ?? null;
  // L'image complète, pour pouvoir la repositionner : l'origine si elle existe.
  const origine = (fichiers ?? []).filter((f) => f.kind === "vignette_origine").at(-1) ?? null;
  const aPositionner = origine ?? vignette;
  const moodboard = (fichiers ?? []).filter((f) => f.kind === "moodboard");
  const scenario = (fichiers ?? []).filter((f) => f.kind === "scenario").at(-1) ?? null;
  const urls = await signerImages(supabase, [
    aPositionner?.storage_path,
    ...moodboard.map((m) => m.storage_path),
  ]);
  const accept = "image/jpeg,image/png,image/webp,image/avif";

  // Le scénario se relit dans la page, page par page, comme sur WFG 1
  // (22/11, remarque d'un auteur reprise par Sarah). Lien signé une heure,
  // demandé avec le client à privilèges : pendant la lecture, la règle de
  // stockage ferme le fichier à son auteur en écriture comme en lecture,
  // alors qu'il doit pouvoir continuer à le relire. La page n'est ouverte
  // qu'au porteur du projet et à l'administration (chargerProjetAModifier).
  let lienScenario: string | null = null;
  if (scenario) {
    const { data: signe } = await (createAdminClient() ?? supabase).storage
      .from("scenarios")
      .createSignedUrl(scenario.storage_path, 60 * 60);
    lienScenario = signe?.signedUrl ?? null;
  }

  // Le StoryPitch (22/10) : ce qui est en ligne (Vimeo), ce qui attend, et
  // si la personne peut en déposer un — voir plus bas.
  const [{ data: videopitchEnLigne }, { data: depots }, { data: adherent }, { data: estAdmin }, { data: autorisation }] = await Promise.all([
    supabase.from("project_videopitchs").select("videopitch_fr, videopitch_en").eq("project_id", id).maybeSingle(),
    supabase
      .from("videopitch_depots")
      .select("id, langue, etat, nom_origine, motif_refus, cree_le")
      .eq("project_id", id)
      .eq("genre", "videopitch")
      .order("cree_le", { ascending: false })
      .returns<DepotAffiche[]>(),
    supabase.rpc("a_une_adhesion_active", { p_profile_id: projet.owner_id }),
    supabase.rpc("is_admin"),
    supabase.from("storypitch_autorises").select("project_id").eq("project_id", id).maybeSingle(),
  ]);
  // « Envoyer » (09/11) : la lecture se paie 60 €, 50 € pour un adhérent (11/11). Le bouton
  // paraît quand le scénario est là, tant que le projet n'a pas déjà été
  // envoyé ou lu. En mode test (compte HelloAsso de test), seule
  // l'administration le voit : personne d'autre ne paie avec une fausse carte.
  const [{ data: statutProjet }, { data: etatBrut }, { data: demandesPayees }, { data: enCoursLe }] = await Promise.all([
    supabase.from("projects").select("status").eq("id", id).maybeSingle<{ status: string }>(),
    supabase.rpc("etat_de_lecture", { p_project_id: id }),
    supabase
      .from("lecture_demandes")
      .select("paid_at")
      .eq("project_id", id)
      .eq("status", "payee")
      .order("paid_at", { ascending: false })
      .limit(1)
      .returns<{ paid_at: string | null }[]>(),
    // La lecture payée dont l'analyse n'est pas encore rendue.
    supabase.rpc("lecture_demande_en_cours", { p_project_id: id }),
  ]);
  // Pendant la lecture (de l'envoi, quelques minutes de vérification
  // passées, jusqu'à la publication de l'analyse), l'auteur ne peut plus
  // changer son scénario (11/11, Sarah) ; ensuite il dépose sa version
  // retravaillée, qui écrase l'ancienne. La base fait respecter la règle
  // (migrations 0254 et 0255).
  const { data: enLecture } = await supabase.rpc("scenario_en_lecture", { p_project_id: id });
  const scenarioModifiable = estAdmin === true || enLecture !== true;
  const test = modeHelloAsso() === "sandbox";
  const peutPayer = !test || estAdmin === true || testeurPaiement(user?.id);
  const envoyeLe = (demandesPayees ?? [])[0]?.paid_at ?? null;
  // « Envoyé » = une lecture payée attend encore son analyse.
  const dejaEnvoye = !!enCoursLe;
  const etatLecture = ((etatBrut ?? []) as { etat: string }[])[0]?.etat ?? null;
  const dejaLu =
    etatLecture !== null || !["brouillon", "depose"].includes(statutProjet?.status ?? "");
  // « Nouvelle analyse » : l'analyse est rendue, l'auteur a retravaillé sa
  // version et la renvoie sur la même fiche.
  const nouvelleAnalyse = !dejaEnvoye && etatLecture === "disponible";

  // Qui peut déposer un StoryPitch (09/11, Sarah : « Quand on paye 50 euros,
  // on a un retour de lecture et on doit mettre un StoryPitch associé au
  // projet. Quand on est adhérent […] on peut ajouter un StoryPitch sans
  // avoir à rien repayer ») : le porteur dont la lecture de ce projet est
  // payée, le porteur adhérent, ou l'administration.
  const peutDeposerVideopitch = dejaEnvoye || adherent === true || estAdmin === true || !!autorisation;

  const dernierParLangue = (["fr", "en"] as const)
    .map((l) => (depots ?? []).find((d) => d.langue === l))
    .filter((d): d is DepotAffiche => Boolean(d));

  // « Envoyer » (20/11, Sarah) : sous le scénario, dans le même formulaire,
  // pour qu'on ne le prenne pas pour le bouton du StoryPitch. Il enregistre
  // d'abord le scénario choisi, puis mène à la page de paiement. Quand le
  // scénario n'est plus modifiable (lecture en cours), il reste après le
  // formulaire.
  const blocEnvoi =
    peutPayer && (dejaEnvoye || !dejaLu || nouvelleAnalyse) ? (
      <div style={{ marginTop: 24 }}>
              <h2 className={styles.sousTitre}>Envoyer à la lecture</h2>
              {dejaEnvoye ? (
                <p className={formStyles.hint}>
                  Projet envoyé à la lecture
                  {envoyeLe
                    ? ` le ${new Date(envoyeLe).toLocaleDateString("fr-FR", {
                        timeZone: "Europe/Paris",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}`
                    : ""}
                  .
                </p>
              ) : (
                <>
                  <p className={formStyles.hint}>
                    {nouvelleAnalyse
                      ? "Nouvelle lecture et analyse de votre scénario retravaillé"
                      : "Lecture et analyse de votre scénario"}{" "}
                    : {adherent === true ? "50 €" : "60 €"}. Le paiement passe par HelloAsso.
                  </p>
                  {paiement === "erreur" && (
                    <p className={formStyles.error}>
                      Le paiement n&apos;a pas pu démarrer. Réessayez dans un instant, ou écrivez-nous.
                    </p>
                  )}
                  {scenario && vignette ? (
                    <div style={{ marginTop: 12 }}>
                      <button type="submit" name="envoyer" value="1" className={formStyles.submit}>
                        Envoyer
                      </button>
                    </div>
                  ) : (
                    <p className={formStyles.hint}>
                      {!scenario
                        ? "Enregistrez d'abord votre scénario (PDF) pour l'envoyer à la lecture."
                        : "Enregistrez d'abord l'image de présentation de votre projet pour l'envoyer à la lecture."}
                    </p>
                  )}
                  {test && (
                    <p className={formStyles.hint} style={{ marginTop: 8 }}>
                      Mode test : paiement sur le compte HelloAsso de test, avec une fausse carte.
                      Visible de l&apos;administration et des testeurs seulement.
                    </p>
                  )}
                </>
              )}
            </div>
    ) : null;

  return (
    <BlocProjet actif="documents" projet={projet}>
      {cree && (
        <p className={profilStyles.ok}>
          Votre fiche « {projet.title} » est créée. Passons aux documents — ou plus tard, si vous
          préférez : tout est déjà enregistré.
        </p>
      )}
      {enregistre && <p className={profilStyles.ok}>Documents enregistrés.</p>}

      <form
        className={formStyles.form}
        action={enregistrerDocuments}
        encType="multipart/form-data"
        style={{ marginTop: 16 }}
      >
        <input type="hidden" name="project_id" value={projet.id} />
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <h2 className={styles.sousTitre}>L&apos;image de présentation</h2>
        <p className={formStyles.hint}>
          C&apos;est elle qui représente votre projet dans les Galaxies, et en haut de votre
          fiche. Format 16/9 (paysage), JPG, PNG, WebP ou AVIF. N&apos;y faites figurer ni votre nom ni le
          titre.
        </p>
        <ImagePresentation
          urlActuelle={aPositionner ? (urls.get(aPositionner.storage_path) ?? null) : null}
          accept={accept}
          aUneImage={!!vignette}
        />

        <h2 className={styles.sousTitre}>Moodboard</h2>
        <p className={formStyles.hint}>
          Des images d&apos;ambiance — références de films qui vous ont inspirés, lumières,
          lieux, visages — qui donnent le ton de votre film. Le Moodboard peut être consulté par
          les lecteurs en validant la case au moment du dépôt du projet à la lecture.
        </p>
        {/* Phrase validée par Sarah le 22/11 : le cadre est fait pour des photos isolées. */}
        <p className={formStyles.hint}>
          Une photo par image : évitez les pages de dossier qui en regroupent plusieurs.
        </p>
        {moodboard.length > 0 && (
          <ul className={styles.grilleImages}>
            {moodboard.map((m) => (
              <li key={m.id}>
                {urls.get(m.storage_path) && <img src={urls.get(m.storage_path)} alt="" />}
                <BoutonRetirerPhoto projectId={projet.id} fileId={m.id} />
              </li>
            ))}
          </ul>
        )}
        {/* Plus de limite au nombre de photos (14/10, Sarah). */}
        <div className={formStyles.field}>
          <span>{moodboard.length ? "Ajouter des photos" : "Choisir des photos"}</span>
          <ZoneMoodboard projectId={projet.id} />
          <span className={formStyles.hint}>Vous pouvez en glisser ou en choisir plusieurs à la fois.</span>
        </div>

        {(scenarioModifiable || lienScenario) && <h2 className={styles.sousTitre}>Le scénario</h2>}
        {scenario && lienScenario && (
          <>
            <p className={formStyles.hint}>
              <a href={lienScenario} target="_blank" rel="noopener noreferrer">
                {scenario.original_name ?? "scenario.pdf"}
              </a>
            </p>
            <iframe
              src={lienScenario}
              title={scenario.original_name ?? "Scénario"}
              style={{ width: "100%", height: "80vh", minHeight: 480, border: "1px solid #ccc", background: "#fff", marginBottom: 16 }}
            />
          </>
        )}
        {scenarioModifiable && (
          <>
            <label className={formStyles.field}>
              <span>{scenario ? "Remplacer le scénario (PDF)" : "Scénario (PDF)"}</span>
              <ChampFichier name="scenario" accept="application/pdf" />
              <span className={formStyles.hint}>
                Confidentiel : seuls vous, les lecteurs qui en seront chargés et
                l&apos;équipe de la Maison des Scénaristes/WeFilmGood y auront accès.
              </span>
            </label>
          </>
        )}
        {scenarioModifiable && blocEnvoi}

        <div className={profilStyles.pied}>
          {/* Rien n'est enregistré sans le bouton : la flèche ramène à « Mes projets » (01/10). */}
          <Link href={`/mes-projets?projet=${id}`} className={profilStyles.lienDiscret}>
            ← Annuler
          </Link>
          <button type="submit" className={formStyles.submit}>
            Enregistrer
          </button>
        </div>
      </form>

      {!scenarioModifiable && blocEnvoi}
      {paiement === "bientot" && (
        <p className={formStyles.hint}>Le paiement en ligne ouvre très bientôt.</p>
      )}

      {/* Le StoryPitch s'envoie à part du formulaire : la vidéo part par
          morceaux dès le clic, sans passer par « Enregistrer ». */}
      <h2 className={styles.sousTitre} style={{ marginTop: 32 }}>Le StoryPitch</h2>
      <p className={formStyles.hint}>
        Deux minutes face caméra pour donner envie de lire votre scénario. Visible des membres
        adhérents sur votre fiche, après un regard de l&apos;équipe.
      </p>
      {(videopitchEnLigne?.videopitch_fr || videopitchEnLigne?.videopitch_en) && (
        <div style={{ maxWidth: 640, margin: "12px 0" }}>
          <VideopitchLecteur
            fr={videopitchEnLigne.videopitch_fr ?? null}
            en={videopitchEnLigne.videopitch_en ?? null}
            titre={projet.title}
          />
        </div>
      )}
      {peutDeposerVideopitch ? (
        <EnvoiVideopitch
          projectId={projet.id}
          enLigne={{ fr: !!videopitchEnLigne?.videopitch_fr, en: !!videopitchEnLigne?.videopitch_en }}
          depots={dernierParLangue}
        />
      ) : (
        <p className={formStyles.hint}>
          L&apos;envoi d&apos;un StoryPitch est compris dans les 60 € de la lecture, et dans
          l&apos;adhésion. <Link href="/adhesion">Adhérer</Link>
        </p>
      )}
      {estAdmin === true && (
        <form action={basculerAutorisationStoryPitch} style={{ marginTop: 16 }}>
          <input type="hidden" name="project_id" value={projet.id} />
          <input type="hidden" name="autoriser" value={autorisation ? "non" : "oui"} />
          <button type="submit" className={formStyles.submit}>
            {autorisation
              ? "Admin : retirer l'accès au dépôt de StoryPitch"
              : "Admin : ouvrir le dépôt de StoryPitch à ce projet"}
          </button>
        </form>
      )}
    </BlocProjet>
  );
}
