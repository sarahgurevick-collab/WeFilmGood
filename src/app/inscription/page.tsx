import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import BoutonFeuArtifice from "@/components/BoutonFeuArtifice";
import BoutonGoogle from "@/components/BoutonGoogle";
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
      <AuthCard active="inscription" carteClaire sansOnglets>
        <p className={formStyles.hint}>
          Un email vient d&apos;être envoyé à <strong>{envoye}</strong>. Cliquez
          sur le lien qu&apos;il contient : votre profil sera activé et vous
          serez connecté.
        </p>
        <p className={formStyles.hint}>
          Il vous suffit d&apos;ajouter ce lien à l&apos;écran d&apos;accueil de votre
          téléphone pour accéder au site comme une app, bien plus pratique pour
          les messages et regarder les videopitchs n&apos;importe où.
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
      {erreur && <p className={formStyles.error}>{erreur}</p>}

      {/* Même écart qu'avant sous l'accroche, quand elle était dans le formulaire. */}
      <div style={{ marginBottom: 10 }}>
        <p className={formStyles.accroche}>WeFilmGood a 10 ans&nbsp;!</p>
        <p className={formStyles.hint}>
          Merci de votre confiance
          <br />
          Cliquer pour souffler les bougies&nbsp;!
        </p>
      </div>

      {/* Un formulaire à part : on ne peut pas en mettre un dans l'autre. */}
      <BoutonGoogle next={nextPath} depuis="inscription" />

      <form className={formStyles.form} action={signUp}>
        <input type="hidden" name="next" value={nextPath} />
        {/* Champ piège : invisible pour une personne, rempli par les robots. */}
        <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
          <label>
            Site internet
            <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
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

        {/* La phrase remplace la case à cocher (28/09, comme chez Vimeo). */}
        <p className={formStyles.mentionCgu}>
          En vous connectant à WeFilmGood, vous acceptez nos{" "}
          <Link href="/cguv">conditions d&apos;utilisation</Link> et reconnaissez avoir pris
          connaissance de notre politique de confidentialité.
        </p>

        <div className={formStyles.pied}>
          <p className={formStyles.hint} style={{ textAlign: "center" }}>
            Pas de mot de passe : vous recevrez un lien par email pour activer votre profil.
          </p>
          <BoutonFeuArtifice className={`${formStyles.submitWide} ${formStyles.rouge}`}>
            Créer mon profil
          </BoutonFeuArtifice>
        </div>
      </form>
    </AuthCard>
  );
}
