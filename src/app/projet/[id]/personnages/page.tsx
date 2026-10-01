import formStyles from "@/components/form.module.css";
import profilStyles from "@/app/profil/profil.module.css";
import BlocProjet from "../../BlocProjet";
import { chargerProjetAModifier } from "../../blocs";
import styles from "../../blocs.module.css";
import CasePortrait from "./CasePortrait";
import ChercheurPortrait from "./ChercheurPortrait";
import { signerImages } from "../fichiers";
import { enregistrerPersonnage, retirerPersonnage } from "./actions";
import { AGES, GENRES_PERSONNAGE, TYPES } from "./options";

type Personnage = {
  id: string;
  name: string;
  actor_name: string | null;
  photo_path: string | null;
  character_type: string | null;
  gender: string | null;
  age_range: string | null;
  biography: string | null;
};

/**
 * Bloc 3 : les personnages. Chacun a son cadre, qui s'enregistre seul ;
 * un cadre en pointillé, en bas, pour en ajouter un.
 */
export default async function PersonnagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string; enregistre?: string }>;
}) {
  const { id } = await params;
  const { erreur, enregistre } = await searchParams;
  const { supabase, projet, pourAutrui } = await chargerProjetAModifier(id, "personnages");

  const { data: personnages } = await supabase
    .from("characters")
    .select("id, name, actor_name, photo_path, character_type, gender, age_range, biography")
    .eq("project_id", id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<Personnage[]>();

  const urls = await signerImages(
    supabase,
    (personnages ?? []).map((p) => p.photo_path),
  );

  return (
    <BlocProjet actif="personnages" projet={projet}>
      {enregistre && <p className={profilStyles.ok}>Personnages enregistrés.</p>}
      {erreur && <p className={formStyles.error}>{erreur}</p>}
      {pourAutrui && (
        <p className={formStyles.avertissement}>
          Vous modifiez la fiche d&apos;un autre membre.
        </p>
      )}

      <p className={profilStyles.chapeau}>
        Un producteur lit d&apos;abord les personnages : c&apos;est par eux qu&apos;il imagine le
        film — et son casting. Deux ou trois lignes suffisent pour chacun.
      </p>

      {(personnages ?? []).length > 0 && (
        <div className={styles.liste}>
          {(personnages ?? []).map((p) => (
            <FormulairePersonnage
              key={p.id}
              projectId={id}
              personnage={p}
              photo={p.photo_path ? (urls.get(p.photo_path) ?? null) : null}
            />
          ))}
        </div>
      )}

      <h2 className={styles.sousTitre} style={{ marginTop: 40 }}>
        {(personnages ?? []).length ? "Ajouter un personnage" : "Votre premier personnage"}
      </h2>
      <FormulairePersonnage projectId={id} personnage={null} photo={null} />
    </BlocProjet>
  );
}

function FormulairePersonnage({
  projectId,
  personnage,
  photo,
}: {
  projectId: string;
  personnage: Personnage | null;
  photo: string | null;
}) {
  return (
    <form
      className={`${styles.personnage} ${personnage ? "" : styles.nouveau}`}
      action={enregistrerPersonnage}
      encType="multipart/form-data"
    >
      <input type="hidden" name="project_id" value={projectId} />
      {personnage && <input type="hidden" name="character_id" value={personnage.id} />}

      <CasePortrait photo={photo ?? null} />

      <div className={styles.personnageChamps}>
        <label className={formStyles.field}>
          <span>Nom du personnage</span>
          <input type="text" name="name" required defaultValue={personnage?.name ?? ""} />
        </label>

        <div className={profilStyles.row}>
          <label className={formStyles.field}>
            <span>Rôle</span>
            <select name="character_type" defaultValue={personnage?.character_type ?? ""}>
              <option value="">Non précisé</option>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className={formStyles.field}>
            <span>Le personnage est…</span>
            <select name="gender" defaultValue={personnage?.gender ?? ""}>
              <option value="">Non précisé</option>
              {GENRES_PERSONNAGE.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <label className={formStyles.field}>
            <span>Âge</span>
            <select name="age_range" defaultValue={personnage?.age_range ?? ""}>
              <option value="">Non précisé</option>
              {AGES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={formStyles.field}>
          <span>Quelques lignes</span>
          <textarea
            name="biography"
            rows={4}
            placeholder="Qui est-il ? Que veut-il ? Qu'est-ce qui l'en empêche ? Si vous pensez à un·e comédien·ne pour ce rôle, nommez-le·la ici (« dans l'esprit de Juliette Binoche ») : les producteurs et directeurs de casting le retrouveront dans la Carte des étoiles."
            defaultValue={personnage?.biography ?? ""}
          />
        </label>

        <label className={formStyles.field}>
          <span>{photo ? "Remplacer le portrait" : "Portrait (JPG ou PNG)"}</span>
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" />
        </label>
        <ChercheurPortrait nomInitial={personnage?.actor_name ?? ""} />

        <div className={styles.piedPersonnage}>
          {personnage ? (
            <button
              type="submit"
              formAction={retirerPersonnage}
              formNoValidate
              className={styles.lienDanger}
            >
              Retirer ce personnage
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className={formStyles.submit}>
            {personnage ? "Enregistrer" : "Ajouter"}
          </button>
        </div>
      </div>
    </form>
  );
}
