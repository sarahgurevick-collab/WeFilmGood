import Link from "next/link";
import formStyles from "@/components/form.module.css";
import profilStyles from "@/app/profil/profil.module.css";
import BlocProjet from "../../BlocProjet";
import { chargerProjetAModifier } from "../../blocs";
import styles from "../../blocs.module.css";
import { MAX_MOODBOARD, signerImages } from "../fichiers";
import { enregistrerDocuments, retirerImage } from "./actions";

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
  const { supabase, projet, pourAutrui } = await chargerProjetAModifier(id, "documents");

  const { data: fichiers } = await supabase
    .from("project_files")
    .select("id, kind, storage_path, original_name")
    .eq("project_id", id)
    .order("uploaded_at", { ascending: true })
    .returns<Fichier[]>();

  const vignette = (fichiers ?? []).filter((f) => f.kind === "vignette").at(-1) ?? null;
  const moodboard = (fichiers ?? []).filter((f) => f.kind === "moodboard");
  const scenario = (fichiers ?? []).filter((f) => f.kind === "scenario").at(-1) ?? null;
  const urls = await signerImages(supabase, [
    vignette?.storage_path,
    ...moodboard.map((m) => m.storage_path),
  ]);
  const accept = "image/jpeg,image/png,image/webp";

  return (
    <BlocProjet actif="documents" projet={projet}>
      {cree && (
        <p className={profilStyles.ok}>
          Votre fiche « {projet.title} » est créée. Passons aux documents — ou plus tard, si vous
          préférez : tout est déjà enregistré.
        </p>
      )}
      {enregistre && <p className={profilStyles.ok}>Documents enregistrés.</p>}
      {pourAutrui && (
        <p className={formStyles.avertissement}>
          Vous modifiez la fiche d&apos;un autre membre, en tant qu&apos;administratrice.
        </p>
      )}

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
          C&apos;est elle qui représente votre projet dans la pitchothèque, et en haut de votre
          fiche. Format 16/9 (paysage), JPG ou PNG. N&apos;y faites figurer ni votre nom ni le
          titre.
        </p>
        {vignette && urls.get(vignette.storage_path) && (
          <div className={styles.apercu}>
            <img src={urls.get(vignette.storage_path)} alt="" />
          </div>
        )}
        <label className={formStyles.field}>
          <span>{vignette ? "Remplacer l'image" : "Choisir une image"}</span>
          <input type="file" name="vignette" accept={accept} />
          <span className={formStyles.hint}>
            Inutile de la compresser : nous nous en chargeons.
          </span>
        </label>

        <h2 className={styles.sousTitre}>Moodboard</h2>
        <p className={formStyles.hint}>
          Des images d&apos;ambiance — références de films qui vous ont inspirés, lumières,
          lieux, visages — qui donnent le ton de votre film. Vous pouvez uploader{" "}
          {MAX_MOODBOARD} photos maximum. Le Moodboard peut être consulté par les lecteurs en
          validant la case au moment du dépôt du projet à la lecture.
        </p>
        {moodboard.length > 0 && (
          <ul className={styles.grilleImages}>
            {moodboard.map((m) => (
              <li key={m.id}>
                {urls.get(m.storage_path) && <img src={urls.get(m.storage_path)} alt="" />}
                <button
                  type="submit"
                  formAction={retirerImage}
                  formNoValidate
                  name="file_id"
                  value={m.id}
                  className={styles.retirer}
                >
                  Retirer
                </button>
              </li>
            ))}
          </ul>
        )}
        {moodboard.length < MAX_MOODBOARD ? (
          <label className={formStyles.field}>
            <span>{moodboard.length ? "Ajouter des photos" : "Choisir des photos"}</span>
            <input type="file" name="moodboard" accept={accept} multiple />
            <span className={formStyles.hint}>
              Vous pouvez en choisir plusieurs à la fois — encore{" "}
              {MAX_MOODBOARD - moodboard.length} au plus.
            </span>
          </label>
        ) : (
          <p className={formStyles.hint}>
            Votre Moodboard est complet. Retirez une photo pour en ajouter une autre.
          </p>
        )}

        <h2 className={styles.sousTitre}>Le scénario</h2>
        <label className={formStyles.field}>
          <span>{scenario ? "Remplacer le scénario (PDF)" : "Scénario (PDF)"}</span>
          <input type="file" name="scenario" accept="application/pdf" />
          <span className={formStyles.hint}>
            {scenario && (
              <>
                Fichier actuel : <strong>{scenario.original_name ?? "scénario.pdf"}</strong>.
                Laissez vide pour le conserver.{" "}
              </>
            )}
            Confidentiel : seuls vous, les lecteurs qui en seront chargés et
            l&apos;administration y auront accès.
          </span>
        </label>

        <div className={profilStyles.pied}>
          <Link href={`/projet/${id}`} className={profilStyles.lienDiscret}>
            Voir la fiche
          </Link>
          <button type="submit" className={formStyles.submit}>
            Enregistrer
          </button>
        </div>
      </form>
    </BlocProjet>
  );
}
