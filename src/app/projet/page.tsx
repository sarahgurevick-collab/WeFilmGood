import { redirect } from "next/navigation";
import formStyles from "@/components/form.module.css";
import profilStyles from "@/app/profil/profil.module.css";
import { createClient } from "@/lib/supabase/server";
import BlocProjet from "./BlocProjet";
import ChampsFiche from "./ChampsFiche";
import { createProject } from "./actions";
import styles from "./deposer.module.css";

/**
 * Bloc 1 d'une nouvelle fiche : la fiche elle-même. C'est elle qui crée
 * le projet ; les documents et les personnages viennent ensuite.
 */
export default async function NouvelleFichePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/projet");

  const { data: genres } = await supabase
    .from("genres")
    .select("slug, label_fr")
    .order("position", { ascending: true });

  return (
    <BlocProjet actif="fiche" projet={null}>
      <p className={profilStyles.chapeau}>
        Les éléments avec une * sont essentiels à la création de la fiche projet. Plus votre
        fiche est soigneusement remplie, plus elle est mise en avant par le site.
      </p>
      <form
        className={`${formStyles.form} ${styles.formulaire}`}
        action={createProject}
        encType="multipart/form-data"
        style={{ marginTop: 24 }}
      >
        {erreur && <p className={formStyles.error}>{erreur}</p>}
        <ChampsFiche valeurs={null} genres={genres ?? []} />

        {/* Facultative ici : l'image apparaît aussitôt sur l'affiche à
            gauche, et se change ensuite dans le bloc « Documents ». */}
        <label className={formStyles.field}>
          <span>L&apos;image de présentation</span>
          <span className={formStyles.hint}>
            C&apos;est elle qui représente votre projet dans la pitchothèque, et en haut de votre
            fiche. Format 16/9 (paysage), JPG ou PNG. N&apos;y faites figurer ni votre nom ni le
            titre.
          </span>
          <input type="file" name="vignette" accept="image/jpeg,image/png,image/webp" />
          <span className={formStyles.hint}>Inutile de la compresser : nous nous en chargeons.</span>
        </label>
        <button type="submit" className={formStyles.submit}>
          Créer ma fiche projet
        </button>
      </form>
    </BlocProjet>
  );
}
