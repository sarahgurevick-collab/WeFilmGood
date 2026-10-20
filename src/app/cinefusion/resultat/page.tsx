import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { lireBrouillon, meilleurMatch } from "@/lib/cinematch";
import { createClient } from "@/lib/supabase/server";
import { demanderLeMatch } from "../actions";
import ResultatMatch from "../ResultatMatch";
import { TEXTES } from "../textes";

/**
 * Après les questions, pour un visiteur sans compte : son pourcentage de
 * match, puis la demande d'adresse email qui crée son profil Greenlighter.
 */
export default async function ResultatCinefusionPage({
  searchParams,
}: {
  searchParams: Promise<{ envoye?: string; erreur?: string }>;
}) {
  const { envoye, erreur } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/cinefusion");

  if (envoye) {
    return (
      <PageShell title={TEXTES.titre} theme="clair" enTeteAnime connecte={false}>
        <p className={formStyles.hint}>{TEXTES.emailEnvoye(envoye)}</p>
        <p className={formStyles.hint}>{TEXTES.emailRien}</p>
      </PageShell>
    );
  }

  const reponses = await lireBrouillon();
  if (!reponses) redirect("/cinefusion");
  const match = await meilleurMatch(reponses);

  return (
    <PageShell title={TEXTES.titre} theme="clair" enTeteAnime connecte={false}>
      <ResultatMatch match={match} />

      {match && (
        <form className={formStyles.form} action={demanderLeMatch}>
          {/* Champ piège : invisible pour une personne, rempli par les robots. */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
            <label>
              Site internet
              <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>

          <p className={formStyles.hint}>{TEXTES.emailExplication}</p>
          {erreur && <p className={formStyles.error}>{TEXTES.emailInvalide}</p>}
          <label className={formStyles.field}>
            <span>{TEXTES.emailChamp}</span>
            <input type="email" name="email" required autoComplete="email" placeholder="jeanne@exemple.com" />
          </label>
          <div className={formStyles.pied}>
            <button type="submit" className={formStyles.submit}>
              {TEXTES.emailBouton}
            </button>
          </div>
        </form>
      )}
    </PageShell>
  );
}
