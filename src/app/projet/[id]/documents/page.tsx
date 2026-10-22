import Link from "next/link";
import formStyles from "@/components/form.module.css";
import profilStyles from "@/app/profil/profil.module.css";
import BlocProjet from "../../BlocProjet";
import { chargerProjetAModifier } from "../../blocs";
import styles from "../../blocs.module.css";
import { signerImages } from "../fichiers";
import { enregistrerDocuments } from "./actions";
import BoutonRetirerPhoto from "./BoutonRetirerPhoto";
import ImagePresentation from "./ImagePresentation";
import EnvoiVideopitch, { type DepotAffiche } from "./EnvoiVideopitch";

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
  searchParams: Promise<{ erreur?: string; cree?: string; enregistre?: string }>;
}) {
  const { id } = await params;
  const { erreur, cree, enregistre } = await searchParams;
  const { supabase, projet } = await chargerProjetAModifier(id, "documents");

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
  const accept = "image/jpeg,image/png,image/webp";

  // Le videopitch (22/10) : ce qui est en ligne (Vimeo), ce qui attend, et
  // si la personne peut en déposer un — le porteur adhérent, ou l'admin.
  const [{ data: videopitchEnLigne }, { data: depots }, { data: adherent }, { data: estAdmin }] = await Promise.all([
    supabase.from("project_videopitchs").select("videopitch_fr, videopitch_en").eq("project_id", id).maybeSingle(),
    supabase
      .from("videopitch_depots")
      .select("langue, etat, nom_origine, motif_refus, cree_le")
      .eq("project_id", id)
      .order("cree_le", { ascending: false })
      .returns<DepotAffiche[]>(),
    supabase.rpc("a_une_adhesion_active", { p_profile_id: projet.owner_id }),
    supabase.rpc("is_admin"),
  ]);
  const peutDeposerVideopitch = adherent === true || estAdmin === true;
  const dernierParLangue = (["fr", "en"] as const)
    .map((l) => (depots ?? []).find((d) => d.langue === l))
    .filter((d): d is DepotAffiche => Boolean(d));

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
          fiche. Format 16/9 (paysage), JPG ou PNG. N&apos;y faites figurer ni votre nom ni le
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
        <label className={formStyles.field}>
          <span>{moodboard.length ? "Ajouter des photos" : "Choisir des photos"}</span>
          <input type="file" name="moodboard" accept={accept} multiple />
          <span className={formStyles.hint}>Vous pouvez en choisir plusieurs à la fois.</span>
        </label>

        <h2 className={styles.sousTitre}>Le scénario</h2>
        <label className={formStyles.field}>
          <span>{scenario ? "Remplacer le scénario (PDF)" : "Scénario (PDF)"}</span>
          <input type="file" name="scenario" accept="application/pdf" />
          <span className={formStyles.hint}>
            Confidentiel : seuls vous, les lecteurs qui en seront chargés et
            l&apos;équipe de la Maison des Scénaristes/WeFilmGood y auront accès.
          </span>
        </label>

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

      {/* Le videopitch s'envoie à part du formulaire : la vidéo part par
          morceaux dès le clic, sans passer par « Enregistrer ». */}
      <h2 className={styles.sousTitre} style={{ marginTop: 32 }}>Le videopitch</h2>
      <p className={formStyles.hint}>
        Deux minutes face caméra pour donner envie de lire votre scénario. Visible des membres
        adhérents sur votre fiche, après un regard de l&apos;équipe.
      </p>
      {peutDeposerVideopitch ? (
        <EnvoiVideopitch
          projectId={projet.id}
          enLigne={{ fr: !!videopitchEnLigne?.videopitch_fr, en: !!videopitchEnLigne?.videopitch_en }}
          depots={dernierParLangue}
        />
      ) : (
        <p className={formStyles.hint}>
          L&apos;envoi d&apos;un videopitch fait partie de l&apos;adhésion.{" "}
          <Link href="/adhesion">Adhérer</Link>
        </p>
      )}
    </BlocProjet>
  );
}
