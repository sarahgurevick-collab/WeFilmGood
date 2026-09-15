import Link from "next/link";
import PageShell from "@/components/PageShell";
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
    <PageShell eyebrow="Authentification" title="Connexion">
      <form className={formStyles.form} action={signIn}>
        <input type="hidden" name="next" value={nextPath} />
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <label className={formStyles.field}>
          <span>Email</span>
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label className={formStyles.field}>
          <span>Mot de passe</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
          />
        </label>

        <button type="submit" className={formStyles.submit}>
          Se connecter
        </button>

        <p className={formStyles.linkRow}>
          Pas encore de compte ?{" "}
          <Link href={`/inscription?next=${encodeURIComponent(nextPath)}`}>
            Créer un profil
          </Link>
        </p>
      </form>
    </PageShell>
  );
}
