import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import formStyles from "@/components/form.module.css";
import { signIn } from "./actions";

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erreur?: string; envoye?: string }>;
}) {
  const { next, erreur, envoye } = await searchParams;
  const nextPath = next ?? "/";

  if (envoye) {
    return (
      <AuthCard active="connexion" theme="clair">
        <p className={formStyles.hint}>
          Si un compte existe pour <strong>{envoye}</strong>, un lien de connexion
          vient d&apos;y être envoyé. Ouvrez votre boîte mail et cliquez sur le
          lien : vous serez connecté.
        </p>
        <p className={formStyles.hint}>
          Rien reçu après quelques minutes ? Regardez dans les indésirables, ou{" "}
          <Link href="/connexion">recommencez</Link>. Pas encore de compte ?{" "}
          <Link href="/inscription">Créez votre profil</Link>.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard active="connexion" theme="clair">
      <form className={formStyles.form} action={signIn}>
        <input type="hidden" name="next" value={nextPath} />
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <p className={formStyles.hint}>
          Plus besoin de mot de passe : indiquez votre adresse email, vous
          recevrez un lien pour vous connecter.
        </p>

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

        <button type="submit" className={formStyles.submitWide}>
          Recevoir mon lien de connexion
        </button>
      </form>
    </AuthCard>
  );
}
