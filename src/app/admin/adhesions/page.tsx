import { redirect } from "next/navigation";

/**
 * L'ancienne page « Adhésions » a rejoint l'écran des membres
 * (27/09/2026) : colonne Adhésion avec son menu, filtre « Adhésion
 * active ». L'adresse reste valable et y mène.
 */
export default function AdhesionsPage() {
  redirect("/admin/membres?adhesion=active");
}
