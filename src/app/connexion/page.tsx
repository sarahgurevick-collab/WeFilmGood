import Link from "next/link";
import AuthCard from "@/components/AuthCard";
import BoutonFeuArtifice from "@/components/BoutonFeuArtifice";
import BoutonGoogle from "@/components/BoutonGoogle";
import formStyles from "@/components/form.module.css";
import styles from "../inscription/inscription.module.css";
import { continuer } from "./actions";
import { signUp } from "../inscription/actions";
import VisiteGuidee from "@/components/VisiteGuidee";
import { VISITE_INSCRIPTION } from "@/lib/visites";

/**
 * Entrée unique (05/11/2026, Sarah, comme chez Vimeo) : plus d'onglets
 * « Se connecter » / « Créer un profil ». On tape son adresse ; si elle a
 * déjà un compte, le lien de connexion part ; sinon, second écran (« nouveau »)
 * qui demande le prénom et le nom. /inscription renvoie ici.
 */
export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erreur?: string; envoye?: string; cree?: string; nouveau?: string }>;
}) {
  const { next, erreur, envoye, cree, nouveau } = await searchParams;
  const nextPath = next ?? "/";

  // Champ piège : invisible pour une personne, rempli par les robots.
  const piege = (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Site internet
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );

  if (envoye && cree) {
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
          <Link href="/connexion">recommencez</Link>.
        </p>
      </AuthCard>
    );
  }

  if (envoye) {
    return (
      <AuthCard active="connexion" carteClaire sansOnglets>
        <p className={formStyles.hint}>
          Un lien de connexion vient d&apos;être envoyé à <strong>{envoye}</strong>.
          Ouvrez votre boîte mail et cliquez sur le lien : vous serez connecté.
        </p>
        <p className={formStyles.hint}>
          Rien reçu après quelques minutes ? Regardez dans les indésirables, ou{" "}
          <Link href="/connexion">recommencez</Link>.
        </p>
      </AuthCard>
    );
  }

  if (nouveau) {
    return (
      <AuthCard active="inscription" carteClaire sansOnglets>
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <div style={{ marginBottom: 10 }}>
          <p className={formStyles.accroche}>Bienvenue&nbsp;!</p>
          <p className={formStyles.hint}>
            Aucun profil n&apos;existe encore pour <strong>{nouveau}</strong>.
            Vérifiez l&apos;adresse : si elle est fausse,{" "}
            <Link href={`/connexion?next=${encodeURIComponent(nextPath)}`}>corrigez-la</Link>.
          </p>
        </div>

        <form className={formStyles.form} action={signUp}>
          <input type="hidden" name="next" value={nextPath} />
          <input type="hidden" name="email" value={nouveau} />
          {piege}

          <div className={styles.rangee} data-visite="noms">
            <label className={formStyles.field}>
              <span>Prénom</span>
              <input type="text" name="first_name" required autoComplete="given-name" placeholder="Jeanne" autoFocus />
            </label>
            <label className={formStyles.field}>
              <span>Nom</span>
              <input type="text" name="last_name" required autoComplete="family-name" placeholder="Dupont" />
            </label>
          </div>

          <p className={formStyles.mentionCgu}>
            En vous connectant à WeFilmGood, vous acceptez nos{" "}
            <Link href="/cguv">conditions d&apos;utilisation</Link> et reconnaissez avoir pris
            connaissance de notre politique de confidentialité.
          </p>

          <div className={formStyles.pied}>
            <p className={formStyles.hint} style={{ textAlign: "center" }}>
              Pas de mot de passe : vous recevrez un lien par email pour activer votre profil.
            </p>
            <div data-visite="creer">
              <BoutonFeuArtifice className={`${formStyles.submitWide} ${formStyles.rouge}`}>
                Créer mon profil
              </BoutonFeuArtifice>
            </div>
          </div>
        </form>
        {/* Visite guidée : seulement avec « ?visite=1 » (essai du 17/10). */}
        <VisiteGuidee etapes={VISITE_INSCRIPTION.filter((e) => !e.cible.includes("google") && !e.cible.includes("email"))} />
      </AuthCard>
    );
  }

  return (
    <AuthCard active="connexion" carteClaire sansOnglets>
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
      <BoutonGoogle next={nextPath} depuis="connexion" />

      <form className={formStyles.form} action={continuer}>
        <input type="hidden" name="next" value={nextPath} />
        {piege}

        <label className={formStyles.field}>
          <span>Adresse email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="vous@exemple.com"
          />
        </label>

        <p className={formStyles.mentionCgu}>
          En vous connectant à WeFilmGood, vous acceptez nos{" "}
          <Link href="/cguv">conditions d&apos;utilisation</Link> et reconnaissez avoir pris
          connaissance de notre politique de confidentialité.
        </p>

        <div className={formStyles.pied}>
          <p className={formStyles.hint} style={{ textAlign: "center" }}>
            Pas de mot de passe : vous recevrez un lien par email pour vous connecter.
          </p>
          <BoutonFeuArtifice className={`${formStyles.submitWide} ${formStyles.rouge}`}>
            Continuer
          </BoutonFeuArtifice>
        </div>
      </form>
    </AuthCard>
  );
}
