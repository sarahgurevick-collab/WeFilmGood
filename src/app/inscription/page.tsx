import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import formStyles from "@/components/form.module.css";
import styles from "./inscription.module.css";
import { signUp } from "./actions";

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erreur?: string; envoye?: string }>;
}) {
  const { next, erreur, envoye } = await searchParams;
  const nextPath = next ?? "/";

  if (envoye) {
    return (
      <AuthCard active="inscription" carteClaire>
        <p className={formStyles.hint}>
          Un email vient d&apos;être envoyé à <strong>{envoye}</strong>. Cliquez
          sur le lien qu&apos;il contient : votre profil sera activé et vous
          serez connecté.
        </p>
        <p className={formStyles.hint}>
          Rien reçu après quelques minutes ? Regardez dans les indésirables, ou{" "}
          <Link href="/inscription">recommencez</Link>.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard active="inscription" carteClaire>
      <form className={formStyles.form} action={signUp}>
        <input type="hidden" name="next" value={nextPath} />
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <div>
          <p className={styles.accroche}>WeFilmGood a 10 ans&nbsp;!</p>
          <p className={formStyles.hint}>
            Merci de votre confiance
            <br />
            Cliquer pour souffler les bougies&nbsp;!
          </p>
        </div>

        <div className={styles.rangee}>
          <label className={formStyles.field}>
            <span>Prénom</span>
            <input type="text" name="first_name" required autoComplete="given-name" placeholder="Jeanne" />
          </label>
          <label className={formStyles.field}>
            <span>Nom</span>
            <input type="text" name="last_name" required autoComplete="family-name" placeholder="Dupont" />
          </label>
        </div>
        <label className={formStyles.field}>
          <span>Adresse email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="jeanne@exemple.com"
          />
        </label>

        <label className={formStyles.checkline}>
          <input type="checkbox" name="cgu" value="1" required />
          <span>
            J&apos;accepte les <Link href="/cguv">conditions d&apos;utilisation</Link> et la
            politique de confidentialité.
          </span>
        </label>

        <div className={formStyles.pied}>
          <p className={formStyles.hint} style={{ textAlign: "center" }}>
            Pas de mot de passe : vous recevrez un lien par email pour activer votre profil.
          </p>
          <button type="submit" className={`${formStyles.submitWide} ${formStyles.rouge}`}>
            Créer mon profil
          </button>
        </div>
      </form>
    </AuthCard>
  );
}
