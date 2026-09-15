import Link from "next/link";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { requestPasswordReset } from "./actions";

export default async function LostPwdPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; envoye?: string }>;
}) {
  const { erreur, envoye } = await searchParams;

  if (envoye) {
    return (
      <PageShell eyebrow="Authentification" title="Vérifiez votre boîte mail">
        <p className={formStyles.hint}>
          Si un compte existe avec cette adresse, un email contenant un lien de
          réinitialisation vient d&apos;être envoyé. Le lien est valable une
          heure et ne fonctionne qu&apos;une seule fois.
        </p>
        <p className={formStyles.linkRow} style={{ marginTop: 24 }}>
          <Link href="/connexion">Retour à la connexion</Link>
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Authentification" title="Mot de passe oublié">
      <form className={formStyles.form} action={requestPasswordReset}>
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <p className={formStyles.hint}>
          Indiquez l&apos;adresse email de votre compte : vous recevrez un lien
          pour choisir un nouveau mot de passe.
        </p>

        <label className={formStyles.field}>
          <span>Email</span>
          <input type="email" name="email" required autoComplete="email" />
        </label>

        <button type="submit" className={formStyles.submit}>
          Envoyer le lien
        </button>

        <p className={formStyles.linkRow}>
          <Link href="/connexion">Retour à la connexion</Link>
        </p>
      </form>
    </PageShell>
  );
}
