import { redirect } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import formStyles from "@/components/form.module.css";
import { confirmerLien } from "./actions";

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

  return (
    <AuthCard active={inscription ? "inscription" : "connexion"} theme="clair">
      <form className={formStyles.form} action={confirmerLien}>
        <input type="hidden" name="token_hash" value={token_hash} />
        <input type="hidden" name="type" value={type} />
        <input type="hidden" name="next" value={next ?? "/"} />

        <p className={formStyles.hint}>
          {inscription
            ? "Bienvenue ! Un dernier clic pour activer votre profil."
            : "Bonjour ! Cliquez ci-dessous pour vous connecter."}
        </p>

        <button type="submit" className={formStyles.submitWide}>
          {inscription ? "Activer mon profil" : "Me connecter"}
        </button>
      </form>
    </AuthCard>
  );
}
