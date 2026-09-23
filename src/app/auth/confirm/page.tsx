import { redirect } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import BoutonFeuArtifice from "@/components/BoutonFeuArtifice";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { confirmerLien } from "./actions";
import styles from "./page.module.css";

/**
 * Arrivée depuis le lien reçu par email. La session ne s'ouvre qu'au clic :
 * certaines messageries visitent les liens pour les analyser, et une simple
 * visite suffirait sinon à consommer ce lien à usage unique.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash, type, next } = await searchParams;

  // Sans jeton dans l'URL, la session est probablement dans le fragment, que
  // le serveur ne reçoit pas. Le navigateur le conserve à travers cette
  // redirection : l'accueil saura le lire.
  if (!token_hash || !type) redirect("/");

  const inscription = type === "invite" || type === "signup";

  const supabase = await createClient();
  const { data: prenom } = await supabase.rpc("prenom_du_lien", { p_token_hash: token_hash });
  const salut = inscription ? "Bienvenue" : "Bonjour";

  return (
    // Rien à choisir ici : pas d'onglets, une carte à la taille de son
    // contenu, et le bouton juste sous la phrase.
    <AuthCard
      active={inscription ? "inscription" : "connexion"}
      theme="clair"
      sansOnglets
      compacte
      logoAnime
    >
      <form className={formStyles.form} action={confirmerLien}>
        <input type="hidden" name="token_hash" value={token_hash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next ?? "/"} />

        <div className={styles.accueil}>
          <p className={styles.bonjour}>
            {prenom ? `${salut} ${prenom} !` : `${salut} !`}
          </p>
          <p className={styles.consigne}>
            {inscription
              ? "Un dernier clic pour activer votre profil."
              : "Un clic pour vous connecter."}
          </p>
        </div>

        <BoutonFeuArtifice className={`${formStyles.submitWide} ${formStyles.rouge}`}>
          {inscription ? "Activer mon profil" : "Me connecter"}
        </BoutonFeuArtifice>

        {/* Le malentendu le plus courant : croire qu'il faudra un lien à
            chaque visite. Le dire ici, au moment où l'on se connecte. */}
        <p className={styles.rappel}>
          Sur cet appareil, vous resterez connecté·e : pas besoin de lien la prochaine fois.
        </p>
      </form>
    </AuthCard>
  );
}
