import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { jetonValide } from "@/lib/mailing";
import { seDesinscrire } from "./actions";

export const metadata = { robots: { index: false } };

/**
 * Le lien « Ne plus recevoir ces emails » des mailings (16/11/2026). Il
 * s'ouvre sans compte ; la désinscription demande un clic sur le bouton,
 * pour qu'un antivirus qui visite les liens d'un email ne désinscrive
 * personne. Les emails du fonctionnement du site continuent d'arriver.
 * TEXTES : propositions, à faire valider par Sarah.
 */
export default async function DesinscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; j?: string; fait?: string }>;
}) {
  const { p, j, fait } = await searchParams;
  const valide = !!p && !!j && jetonValide(p, j);

  return (
    <PageShell title="Emails de WeFilmGood" theme="clair" connecte={false}>
      {fait ? (
        <p className={formStyles.hint}>
          C&apos;est noté : vous ne recevrez plus nos envois d&apos;information. Les emails liés à votre
          compte (lien de connexion, messages reçus) continuent d&apos;arriver.
        </p>
      ) : valide ? (
        <form action={seDesinscrire} className={formStyles.form}>
          <input type="hidden" name="p" value={p} />
          <input type="hidden" name="j" value={j} />
          <p className={formStyles.hint}>
            Vous ne souhaitez plus recevoir nos envois d&apos;information ? Les emails liés à votre compte
            (lien de connexion, messages reçus) continueront d&apos;arriver.
          </p>
          <div className={formStyles.pied}>
            <button type="submit" className={formStyles.submit}>
              Ne plus recevoir ces emails
            </button>
          </div>
        </form>
      ) : (
        <p className={formStyles.hint}>Ce lien n&apos;est pas valide.</p>
      )}
    </PageShell>
  );
}
