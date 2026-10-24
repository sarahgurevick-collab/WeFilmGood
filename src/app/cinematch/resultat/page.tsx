import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { lireBrouillon } from "@/lib/cinematch";
import { createClient } from "@/lib/supabase/server";
import { creerProfilMetier, demanderLeMatch } from "../actions";
import TitreCineMatch from "../TitreCineMatch";
import { TEXTES } from "../textes";

/** Champ piège : invisible pour une personne, rempli par les robots. */
const PIEGE = (
  <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
    <label>
      Site internet
      <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
    </label>
  </div>
);

/**
 * Après « Enregistrer vos réponses », pour un visiteur sans compte : le
 * résultat ne se montre pas encore, il s'ouvre par le lien magique, sur la
 * page liée à son profil (/cinematch). Ici : « Êtes-vous du métier ? ».
 *  - Non : l'adresse email seulement, et il devient StoryLighter ;
 *  - Oui : l'inscription habituelle (prénom, nom, email), puis son profil.
 */
export default async function ResultatCineMatchPage({
  searchParams,
}: {
  searchParams: Promise<{ envoye?: string; erreur?: string; metier?: string }>;
}) {
  const { envoye, erreur, metier } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/cinematch");

  if (envoye) {
    return (
      <PageShell title={<TitreCineMatch />} theme="clair" enTeteAnime connecte={false}>
        <p className={formStyles.hint}>{TEXTES.emailEnvoye(envoye)}</p>
        <p className={formStyles.hint}>{TEXTES.emailRien}</p>
      </PageShell>
    );
  }

  if (!(await lireBrouillon())) redirect("/cinematch");

  const mentionCgu = (
    <p className={formStyles.mentionCgu}>
      En vous connectant à WeFilmGood, vous acceptez nos{" "}
      <Link href="/cguv">conditions d&apos;utilisation</Link> et reconnaissez avoir pris
      connaissance de notre politique de confidentialité.
    </p>
  );

  return (
    <PageShell title={<TitreCineMatch />} theme="clair" enTeteAnime connecte={false}>
      {metier !== "oui" && metier !== "non" && (
        <section style={{ textAlign: "center" }}>
          <p className={formStyles.hint}>{TEXTES.reponsesMemorisees}</p>
          <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>{TEXTES.questionMetier}</h2>
          <p className={formStyles.hint}>{TEXTES.questionMetierPrecision}</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 12 }}>
            <Link href="/cinematch/resultat?metier=oui" className={formStyles.submit}>
              {TEXTES.reponseOui}
            </Link>
            <Link href="/cinematch/resultat?metier=non" className={formStyles.submit}>
              {TEXTES.reponseNon}
            </Link>
          </div>
        </section>
      )}

      {metier === "non" && (
        <form className={formStyles.form} action={demanderLeMatch}>
          {PIEGE}
          <p className={formStyles.hint}>{TEXTES.emailExplication}</p>
          {erreur && <p className={formStyles.error}>{TEXTES.emailInvalide}</p>}
          <label className={formStyles.field}>
            <span>{TEXTES.emailChamp}</span>
            <input type="email" name="email" required autoComplete="email" placeholder="jeanne@exemple.com" />
          </label>
          {mentionCgu}
          <div className={formStyles.pied}>
            <button type="submit" className={formStyles.submit}>
              {TEXTES.emailBouton}
            </button>
          </div>
          <Link href="/cinematch/resultat" className={formStyles.hint}>
            {TEXTES.changerReponse}
          </Link>
        </form>
      )}

      {metier === "oui" && (
        <form className={formStyles.form} action={creerProfilMetier}>
          {PIEGE}
          <p className={formStyles.hint}>{TEXTES.metierExplication}</p>
          {erreur && (
            <p className={formStyles.error}>{erreur === "champs" ? "Tous les champs sont obligatoires." : TEXTES.emailInvalide}</p>
          )}
          <label className={formStyles.field}>
            <span>{TEXTES.champPrenom}</span>
            <input type="text" name="first_name" required autoComplete="given-name" placeholder="Jeanne" />
          </label>
          <label className={formStyles.field}>
            <span>{TEXTES.champNom}</span>
            <input type="text" name="last_name" required autoComplete="family-name" placeholder="Dupont" />
          </label>
          <label className={formStyles.field}>
            <span>{TEXTES.emailChamp}</span>
            <input type="email" name="email" required autoComplete="email" placeholder="jeanne@exemple.com" />
          </label>
          {mentionCgu}
          <div className={formStyles.pied}>
            <button type="submit" className={formStyles.submit}>
              {TEXTES.metierBouton}
            </button>
          </div>
          <Link href="/cinematch/resultat" className={formStyles.hint}>
            {TEXTES.changerReponse}
          </Link>
        </form>
      )}
    </PageShell>
  );
}
