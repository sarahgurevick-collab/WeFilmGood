import { redirect } from "next/navigation";

/** L'administration s'ouvre sur la page qui sert vingt fois par jour. */
export default function AdminPage() {
  // Le premier onglet : les projets en attente (28/09).
  redirect("/admin/projets-en-attente");
}
