import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import FichesDuLecteur from "../FichesDuLecteur";

export default async function MesFichesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/lecteur/mes-fiches");
  }

  return (
    <PageShell
      eyebrow="Espace lecteur"
      title="Mes fiches de lecture"
      nav="lectures"
      theme="clair"
    >
      <FichesDuLecteur supabase={supabase} userId={user.id} lienProjets />

      <p className={formStyles.linkRow} style={{ marginTop: 32 }}>
        <Link href="/lecteur">Retour à mes lectures</Link>
      </p>
    </PageShell>
  );
}
