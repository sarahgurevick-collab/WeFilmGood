import { redirect } from "next/navigation";

/**
 * L'ancienne page « Profils à valider » a rejoint l'écran des membres
 * (27/09/2026) : filtre « À valider », colonne Validation. L'adresse
 * reste valable et y mène.
 */
export default function ProfilsPage() {
  redirect("/admin/membres?metier=avalider");
}
