import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import formStyles from "@/components/form.module.css";
import { signIn } from "./actions";

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erreur?: string }>;
}) {
  const { next, erreur } = await searchParams;
  const nextPath = next ?? "/";

  return (
    <AuthCard active="connexion">
      <form className={formStyles.form} action={signIn}>
        <input type="hidden" name="next" value={nextPath} />
        {erreur && <p className={formStyles.error}>{erreur}</p>}

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
          <input type="password" name="password" required autoComplete="current-password" />
        </label>

        <button type="submit" className={formStyles.submitWide}>
          Se connecter
        </button>

        <p className={formStyles.linkRow} style={{ textAlign: "center" }}>
          <Link href="/lost-pwd">Mot de passe oublié ?</Link>
        </p>
      </form>
    </AuthCard>
  );
}
