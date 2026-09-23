import Link from "next/link";
import { redirect } from "next/navigation";
import formStyles from "@/components/form.module.css";
import { PAYS } from "@/lib/pays";
import { createClient } from "@/lib/supabase/server";
import BlocProfil from "../BlocProfil";
import ChampPhoto from "./ChampPhoto";
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
  searchParams: Promise<{ erreur?: string; photo?: string }>;
}) {
  const { erreur, photo } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/profil/identite");

  const [{ data: profil }, { data: prive }, { data: langues }, { data: toutesLangues }] = await Promise.all([
    supabase.from("profiles").select("category, city, country, website, first_name, last_name, full_name, avatar_url").eq("id", user.id).maybeSingle(),
    supabase.from("profile_private_details").select("phone").eq("profile_id", user.id).maybeSingle(),
    supabase.from("profile_languages").select("language_code").eq("profile_id", user.id),
    supabase.from("languages").select("code, label_fr").order("position"),
  ]);
  const aLangue = (code: string) => (langues ?? []).some((l) => l.language_code === code);

  return (
    <BlocProfil actif="identite">
      {/* La photo a son propre envoi, à part du formulaire : elle part dès
          qu'on la choisit, sans attendre les champs obligatoires. */}
      {photo && <p className={styles.ok}>Photo enregistrée.</p>}
      <ChampPhoto
        photo={profil?.avatar_url ?? null}
        initiale={(profil?.first_name ?? profil?.full_name ?? "?").trim().charAt(0).toUpperCase()}
      />
      <form className={`${formStyles.form} ${styles.formulaireIdentite}`} action={saveIdentite} style={{ marginTop: 24 }}>
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        {/* Le nom sous lequel le membre apparaît partout sur le site. Un
            nom de plume se met ici, tel quel : il n'y a pas de case
            « pseudonyme », et personne n'a besoin de l'état civil. */}
        <div className={styles.row}>
          <label className={formStyles.field}>
            <span>Prénom</span>
            <input
              type="text"
              name="first_name"
              required
              autoComplete="given-name"
              defaultValue={profil?.first_name ?? ""}
            />
          </label>
          <label className={formStyles.field}>
            <span>Nom</span>
            <input
              type="text"
              name="last_name"
              required
              autoComplete="family-name"
              defaultValue={profil?.last_name ?? ""}
            />
          </label>
        </div>
        <p className={formStyles.hint} style={{ marginTop: -14 }}>
          C&apos;est le nom que les autres membres voient. Si vous signez sous un nom de plume,
          c&apos;est lui qu&apos;il faut mettre ici.
        </p>

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

        <fieldset className={styles.cadreAdmin}>
          <legend className={styles.cadreAdminTitre}>Réservé à l&apos;administration</legend>
          <p className={formStyles.hint}>
            Ces informations ne sont jamais montrées aux autres membres. Elles servent à
            l&apos;administration de WeFilmGood pour vous joindre.
          </p>

          <div className={styles.row}>
            <div className={formStyles.field}>
              <span>Adresse email</span>
              <p className={styles.valeurFixe}>{user.email}</p>
            </div>
            <label className={formStyles.field}>
              <span>Téléphone (avec indicatif)</span>
              <input
                type="tel"
                name="phone"
                required
                defaultValue={prive?.phone ?? ""}
                placeholder="+33 6 12 34 56 78"
                autoComplete="tel"
              />
            </label>
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

        </fieldset>

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
