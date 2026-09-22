import Link from "next/link";
import formStyles from "@/components/form.module.css";
import profilStyles from "@/app/profil/profil.module.css";
import BlocProjet from "../../BlocProjet";
import ChampsFiche from "../../ChampsFiche";
import { chargerProjetAModifier } from "../../blocs";
import styles from "../../deposer.module.css";
import { modifierProjet } from "./actions";

/** Bloc 1 d'une fiche existante : titre, tagline, logline, format, genre, prix, scénario. */
export default async function ModifierProjetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;
  const { supabase, projet, pourAutrui } = await chargerProjetAModifier(id, "fiche");

  const [{ data: genres }, { data: scenario }] = await Promise.all([
    supabase.from("genres").select("slug, label_fr").order("position"),
    supabase
      .from("project_files")
      .select("original_name")
      .eq("project_id", id)
      .eq("kind", "scenario")
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ original_name: string | null }>(),
  ]);

  return (
    <BlocProjet actif="fiche" projet={projet}>
      {pourAutrui && (
        <p className={formStyles.avertissement}>
          Vous modifiez la fiche d&apos;un autre membre, en tant qu&apos;administratrice.
        </p>
      )}

      <form
        className={`${formStyles.form} ${styles.formulaire}`}
        action={modifierProjet}
        encType="multipart/form-data"
        style={{ marginTop: 24 }}
      >
        <input type="hidden" name="project_id" value={projet.id} />
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <ChampsFiche
          valeurs={projet}
          genres={genres ?? []}
          scenarioActuel={scenario?.original_name ?? null}
        />

        <div className={profilStyles.pied}>
          <Link href={`/projet/${id}`} className={profilStyles.lienDiscret}>
            Annuler
          </Link>
          <button type="submit" className={formStyles.submit}>
            Enregistrer
          </button>
        </div>
      </form>
    </BlocProjet>
  );
}
