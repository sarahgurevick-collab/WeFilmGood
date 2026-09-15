import Link from "next/link";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "./actions";

export default async function NouveauMotDePassePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // On arrive ici avec une session ouverte par le lien de réinitialisation.
  // Sans session, le lien a expiré ou a déjà été utilisé.
  if (!user) {
    return (
      <PageShell eyebrow="Authentification" title="Lien expiré">
        <p className={formStyles.hint}>
          Ce lien de réinitialisation n&apos;est plus valide : il a expiré ou il
          a déjà servi. Les liens ne fonctionnent qu&apos;une seule fois.
        </p>
        <p className={formStyles.linkRow} style={{ marginTop: 24 }}>
          <Link href="/lost-pwd">Demander un nouveau lien</Link>
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell eyebrow="Authentification" title="Nouveau mot de passe">
      <form className={formStyles.form} action={updatePassword}>
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <p className={formStyles.hint}>Compte : {user.email}</p>

        <label className={formStyles.field}>
          <span>Nouveau mot de passe</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <label className={formStyles.field}>
          <span>Confirmez le mot de passe</span>
          <input
            type="password"
            name="password_confirm"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        <button type="submit" className={formStyles.submitWide}>
          Enregistrer
        </button>
      </form>
    </PageShell>
  );
}
