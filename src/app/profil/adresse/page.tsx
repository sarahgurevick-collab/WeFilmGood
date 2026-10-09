import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import styles from "../profil.module.css";
import { demanderAdresse } from "./actions";

/**
 * Changer d'adresse email (09/10/2026, Sarah : une adresse spammée doit
 * pouvoir être remplacée). Le lien de confirmation part à la nouvelle
 * adresse ; rien ne change avant le clic.
 */
export default async function AdressePage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string; envoye?: string }>;
}) {
  const { erreur, envoye } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/profil/adresse");

  return (
    <PageShell nav="profil" connecte>
      <h1 className={styles.titre}>Changer d&apos;adresse email</h1>

      {envoye ? (
        <>
          <p>
            Un lien de confirmation vient de partir à <strong>{envoye}</strong>. Ouvrez-le pour
            terminer le changement. Jusque-là, votre adresse reste {user.email}.
          </p>
          <p style={{ marginTop: 24 }}>
            <Link href="/profil/identite">Retour à mon profil</Link>
          </p>
        </>
      ) : (
        <>
          <p className={formStyles.hint}>
            Votre adresse actuelle : <strong>{user.email}</strong>. Un lien de confirmation sera
            envoyé à la nouvelle adresse. Rien ne change tant que vous n&apos;avez pas cliqué dessus.
          </p>
          <form className={formStyles.form} action={demanderAdresse} style={{ marginTop: 24 }}>
            {erreur && <p className={formStyles.error}>{erreur}</p>}
            <label className={formStyles.field}>
              <span>Nouvelle adresse email</span>
              <input type="email" name="email" required autoComplete="off" placeholder="nouvelle@exemple.com" />
            </label>
            <div className={styles.pied}>
              <Link href="/profil/identite" className={styles.lienDiscret}>
                Annuler
              </Link>
              <button type="submit" className={formStyles.submit}>
                Envoyer le lien de confirmation
              </button>
            </div>
          </form>
        </>
      )}
    </PageShell>
  );
}
