import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import RichTextEditor from "@/components/RichTextEditor";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "../../NavAdmin";

/**
 * Aperçu de la page de relecture d'une fiche rendue sur le nouveau site,
 * tant qu'aucune n'existe : même mise en page, éditeur vide, rien ne
 * s'enregistre.
 */
export default async function ApercuRelecturePage() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  return (
    <PageShell nav="admin"
      avantTitre={<NavAdmin />}
      eyebrow="Fiche de lecture — aperçu"
      title="Titre du projet"
      theme="clair"
    >
      <p className={formStyles.hint}>
        Rendue par Prénom Nom le 23/09/2026 · note du lecteur — / 200
      </p>

      <p className={formStyles.hint} style={{ marginTop: 16 }}>
        Vos corrections ne sont pas visibles par le lecteur : il voit sa version
        et le fait que le projet a été validé, rien d&apos;autre.
      </p>

      <div className={formStyles.form} style={{ marginTop: 32 }}>
        <div className={formStyles.field}>
          <span>Texte publié à l&apos;auteur</span>
          <RichTextEditor name="content" defaultValue="" />
        </div>

        <label className={formStyles.field}>
          <span>Note publiée (au-delà de 150, le projet est labellisé)</span>
          <input type="number" min={0} max={200} placeholder="0" />
        </label>

        <button
          type="button"
          className={formStyles.submit}
          disabled
          title="Aperçu : rien ne s'enregistre"
        >
          Valider et publier
        </button>
      </div>

      <p className={formStyles.linkRow} style={{ marginTop: 32 }}>
        <Link href="/admin/fiches-a-valider">Retour aux fiches à valider</Link>
      </p>
    </PageShell>
  );
}
