import { redirect } from "next/navigation";

/**
 * L'ancienne page « merci » : la création enchaîne désormais sur les
 * illustrations. Un ancien lien renvoie vers la nouvelle fiche.
 */
export default function MerciPage() {
  redirect("/projet");
}
