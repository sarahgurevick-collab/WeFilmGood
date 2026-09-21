import { redirect } from "next/navigation";

/** Il n'y a plus de mot de passe : on se connecte par un lien reçu par email. */
export default function LostPwdPage() {
  redirect("/connexion");
}
