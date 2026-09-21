import Link from "next/link";
import { redirect } from "next/navigation";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import BlocProfil from "../BlocProfil";
import { saveGouts } from "../actions";
import styles from "../profil.module.css";

export default async function GoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/profil/gouts");

  const [{ data: genresChoisis }, { data: tousGenres }] = await Promise.all([
    supabase.from("profile_genres").select("genre_slug").eq("profile_id", user.id),
    supabase.from("genres").select("slug, label_fr").order("position"),
  ]);
  const aGenre = (slug: string) => (genresChoisis ?? []).some((g) => g.genre_slug === slug);

  return (
    <BlocProfil actif="gouts">
      <p className={formStyles.hint}>
        Ces mots-clés permettent aux autres membres de vous trouver.
      </p>

      <form className={formStyles.form} action={saveGouts} style={{ marginTop: 24 }}>
        <div className={formStyles.field}>
          <span>Mes genres de prédilection</span>
          <div className={formStyles.roles}>
            {(tousGenres ?? []).map((g) => (
              <label key={g.slug} className={formStyles.role}>
                <input type="checkbox" name="genres" value={g.slug} defaultChecked={aGenre(g.slug)} />
                {g.label_fr}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.pied}>
          <Link href="/profil" className={styles.lienDiscret}>
            Passer ce bloc
          </Link>
          <button type="submit" className={styles.bouton}>
            Enregistrer et continuer →
          </button>
        </div>
      </form>
    </BlocProfil>
  );
}
