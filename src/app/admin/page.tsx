import { redirect } from "next/navigation";

/** L'administration s'ouvre sur la page qui sert vingt fois par jour. */
export default function AdminPage() {
  redirect("/admin/projets-en-attente");
}
