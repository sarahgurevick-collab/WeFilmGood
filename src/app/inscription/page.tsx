import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import formStyles from "@/components/form.module.css";
import { signUp } from "./actions";

const CATEGORIES = [
  { value: "auteur", label: "Auteur", hint: "J'écris. Aucun pré-requis, profil actif immédiatement." },
  { value: "producteur", label: "Producteur", hint: "Validation par un administrateur." },
  { value: "talent", label: "Autre Talent", hint: "Réalisation, jeu, image, montage, musique… Validation par un administrateur." },
];

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erreur?: string; envoye?: string }>;
}) {
  const { next, erreur, envoye } = await searchParams;
  const nextPath = next ?? "/";

  if (envoye) {
    return (
      <AuthCard active="inscription" theme="clair">
        <p className={formStyles.hint}>
          Un email de confirmation vient de vous être envoyé. Cliquez sur le
          lien qu&apos;il contient pour activer votre profil, puis revenez vous{" "}
          <Link href="/connexion">connecter</Link>.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard active="inscription" theme="clair">
      <form className={formStyles.form} action={signUp}>
        <input type="hidden" name="next" value={nextPath} />
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <div className={formStyles.field}>
          <span>Je suis…</span>
          <div className={formStyles.options}>
            {CATEGORIES.map((c, i) => (
              <label key={c.value} className={formStyles.option}>
                <input
                  type="radio"
                  name="category"
                  value={c.value}
                  required
                  defaultChecked={i === 0}
                />
                <span className={formStyles.optionLabel}>{c.label}</span>
                <span className={formStyles.optionHint}>{c.hint}</span>
              </label>
            ))}
          </div>
        </div>

        <label className={formStyles.field}>
          <span>Nom complet</span>
          <input type="text" name="full_name" required autoComplete="name" placeholder="Jeanne Dupont" />
        </label>
        <label className={formStyles.field}>
          <span>Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="vous@exemple.com"
          />
        </label>
        <label className={formStyles.field}>
          <span>Mot de passe</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        <label className={formStyles.checkline}>
          <input type="checkbox" name="cgu" value="1" required />
          <span>
            J&apos;accepte les <Link href="/cguv">conditions d&apos;utilisation</Link> et la
            politique de confidentialité.
          </span>
        </label>

        <button type="submit" className={formStyles.submitWide}>
          Créer mon profil
        </button>
      </form>
    </AuthCard>
  );
}
