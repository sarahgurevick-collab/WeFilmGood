import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import NavAdmin from "../../../NavAdmin";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, emailDuMembre } from "@/lib/supabase/admin";
import { ecrireAuMembre } from "./actions";

export default async function EcrireAuMembrePage({
  params,
  searchParams,
}: {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<{ envoye?: string; erreur?: string }>;
}) {
  const { profileId } = await params;
  const { envoye, erreur } = await searchParams;

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const admin = createAdminClient();
  const [email, { data: profil }] = await Promise.all([
    emailDuMembre(profileId),
    admin
      ? admin.from("profiles").select("full_name").eq("id", profileId).maybeSingle<{ full_name: string | null }>()
      : Promise.resolve({ data: null }),
  ]);
  if (!email) redirect("/admin/membres");

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} eyebrow="Écrire à un membre" title={profil?.full_name ?? email} theme="clair">
      <p className={formStyles.hint}>
        L&apos;email part de WeFilmGood vers {email}. Sa réponse arrive dans la boîte de la Maison.
      </p>

      {envoye && <p className={formStyles.hint} style={{ color: "#3c9a4a" }}>Email envoyé.</p>}
      {erreur && <p className={formStyles.error}>{erreur}</p>}

      <form className={formStyles.form} action={ecrireAuMembre} style={{ marginTop: 24 }}>
        <input type="hidden" name="profile_id" value={profileId} />
        <label className={formStyles.field}>
          <span>Objet</span>
          <input type="text" name="objet" required />
        </label>
        <label className={formStyles.field}>
          <span>Message</span>
          <textarea name="message" rows={12} required />
        </label>
        <button type="submit" className={formStyles.submit}>
          Envoyer
        </button>
      </form>

      <p className={formStyles.linkRow} style={{ marginTop: 32 }}>
        <Link href="/admin/membres">Retour aux membres</Link>
      </p>
    </PageShell>
  );
}
