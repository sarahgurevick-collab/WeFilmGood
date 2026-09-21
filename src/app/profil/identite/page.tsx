import Link from "next/link";
import { redirect } from "next/navigation";
import formStyles from "@/components/form.module.css";
import { PAYS } from "@/lib/pays";
import { createClient } from "@/lib/supabase/server";
import BlocProfil from "../BlocProfil";
import { saveIdentite } from "../actions";
import styles from "../profil.module.css";

const CATEGORIES = [
  { value: "auteur", label: "Auteur", hint: "J'écris. Profil actif immédiatement." },
  { value: "producteur", label: "Producteur", hint: "Validation par un administrateur." },
  { value: "talent", label: "Autre talent", hint: "Validation par un administrateur." },
];

export default async function IdentitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/profil/identite");

  const { data: profil } = await supabase
    .from("profiles")
    .select("category, city, country")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <BlocProfil actif="identite">
      <form className={formStyles.form} action={saveIdentite} style={{ marginTop: 24 }}>
        <div className={formStyles.field}>
          <span>Je suis…</span>
          <div className={formStyles.options}>
            {CATEGORIES.map((c) => (
              <label key={c.value} className={formStyles.option}>
                <input
                  type="radio"
                  name="category"
                  value={c.value}
                  required
                  defaultChecked={profil?.category === c.value}
                />
                <span className={formStyles.optionLabel}>{c.label}</span>
                <span className={formStyles.optionHint}>{c.hint}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <label className={formStyles.field}>
            <span>Ville</span>
            <input type="text" name="city" defaultValue={profil?.city ?? ""} autoComplete="off" />
          </label>
          <label className={formStyles.field}>
            <span>Pays</span>
            <select name="country" defaultValue={profil?.country ?? ""} autoComplete="off">
              <option value="">Choisir un pays</option>
              {PAYS.map((pays) => (
                <option key={pays} value={pays}>
                  {pays}
                </option>
              ))}
            </select>
          </label>
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
