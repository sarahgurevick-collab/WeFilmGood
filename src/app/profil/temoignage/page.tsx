import Link from "next/link";
import { redirect } from "next/navigation";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import BlocProfil from "../BlocProfil";
import { saveTestimonial } from "../actions";
import styles from "../profil.module.css";

export default async function TemoignagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/profil/temoignage");

  const { data: profil } = await supabase
    .from("profiles")
    .select("testimonial, testimonial_is_public")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <BlocProfil actif="temoignage">
      <p className={formStyles.hint}>
        Si vous cochez &laquo;&nbsp;rendre public&nbsp;&raquo;, votre photo de profil et
        ce texte apparaissent sur la page <Link href="/temoignages">Témoignages</Link>,
        visible par tous, même sans connexion.
      </p>

      <form className={formStyles.form} action={saveTestimonial} style={{ marginTop: 24 }}>
        <label className={formStyles.field}>
          <span>Votre témoignage</span>
          <textarea
            name="testimonial"
            rows={5}
            defaultValue={profil?.testimonial ?? ""}
            placeholder="Ce que WeFilmGood vous a apporté..."
          />
        </label>
        <label className={formStyles.checkline}>
          <input
            type="checkbox"
            name="testimonial_is_public"
            value="1"
            defaultChecked={profil?.testimonial_is_public ?? false}
          />
          <span>Rendre mon témoignage public</span>
        </label>

        <div className={styles.pied}>
          <Link href="/profil" className={styles.lienDiscret}>
            Passer ce bloc
          </Link>
          <button type="submit" className={styles.bouton}>
            Enregistrer et terminer →
          </button>
        </div>
      </form>
    </BlocProfil>
  );
}
