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
  {
    value: "talent",
    label: "Autre talent",
    hint: "Réalisateur, compositeur, comédien, directeur photo, monteur… Validation par un administrateur.",
  },
];

export default async function IdentitePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/profil/identite");

  const [{ data: profil }, { data: langues }, { data: toutesLangues }] = await Promise.all([
    supabase.from("profiles").select("category, city, country, website").eq("id", user.id).maybeSingle(),
    supabase.from("profile_languages").select("language_code").eq("profile_id", user.id),
    supabase.from("languages").select("code, label_fr").order("position"),
  ]);
  const aLangue = (code: string) => (langues ?? []).some((l) => l.language_code === code);

  return (
    <BlocProfil actif="identite">
      <form className={`${formStyles.form} ${styles.formulaireIdentite}`} action={saveIdentite} style={{ marginTop: 24 }}>
        {erreur && <p className={formStyles.error}>{erreur}</p>}
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

        {/* Masqué par CSS quand « Auteur » est coché : un auteur n'a rien à prouver. */}
        <label className={`${formStyles.field} ${styles.reference}`}>
          <span>Votre référence professionnelle</span>
          <input
            type="url"
            name="website"
            defaultValue={profil?.website ?? ""}
            placeholder="https://www.imdb.com/name/…"
          />
          <span className={formStyles.hint}>
            Obligatoire pour un producteur ou un autre talent : votre page IMDb, votre Vimeo
            ou votre site — de quoi montrer au moins une expérience sur un film, un court
            métrage ou un clip. C&apos;est sur cette référence que l&apos;administration
            valide votre profil.
          </span>
        </label>

        <div className={formStyles.field}>
          <span>Langues parlées</span>
          <div className={formStyles.roles}>
            {(toutesLangues ?? []).map((l) => (
              <label key={l.code} className={formStyles.role}>
                <input type="checkbox" name="languages" value={l.code} defaultChecked={aLangue(l.code)} />
                {l.label_fr}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.row}>
          <label className={formStyles.field}>
            <span>Ville</span>
            <input type="text" name="city" required defaultValue={profil?.city ?? ""} autoComplete="off" />
          </label>
          <label className={formStyles.field}>
            <span>Pays</span>
            <select name="country" required defaultValue={profil?.country ?? ""} autoComplete="off">
              <option value="" disabled>
                Choisir un pays
              </option>
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
