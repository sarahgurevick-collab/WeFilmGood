import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { INFORMATIONS_PAR_DEFAUT } from "@/lib/assistant/connaissances";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "../NavAdmin";
import { enregistrerConnaissances, revenirVersionPrecedente } from "./actions";
import styles from "./tchat.module.css";

/**
 * Ce que sait le tchat : l'administration écrit elle-même les
 * informations sur le site que le tchat utilise pour répondre. Les règles
 * de conduite (ne pas inventer, pas d'avis sur les projets…) restent
 * dans le code et ne se modifient pas ici.
 */
export default async function TchatAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ enregistre?: string; retour?: string; erreur?: string }>;
}) {
  const { enregistre, retour, erreur } = await searchParams;
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const { data: ligne } = await supabase
    .from("assistant_connaissances")
    .select("texte, texte_precedent, modifie_le, profil:profiles(full_name)")
    .eq("id", 1)
    .maybeSingle<{
      texte: string;
      texte_precedent: string | null;
      modifie_le: string;
      profil: { full_name: string | null } | null;
    }>();

  const texte = ligne?.texte ?? INFORMATIONS_PAR_DEFAUT;
  const date = ligne
    ? new Date(ligne.modifie_le).toLocaleString("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Paris",
      })
    : null;

  return (
    <PageShell avantTitre={<NavAdmin />} title="Ce que sait le tchat" theme="clair">
      <p className={formStyles.hint}>
        Le tchat répond aux questions des visiteurs et des membres à partir de ce texte, et de
        rien d&apos;autre. Écrivez simplement, comme vous l&apos;expliqueriez à quelqu&apos;un :
        une information par ligne, regroupées par thème. Ce que le tchat ne trouve pas ici, il
        répond qu&apos;il ne sait pas et propose de transmettre à l&apos;équipe.
      </p>
      <p className={formStyles.hint}>
        Il n&apos;est pas utile d&apos;écrire ici comment il doit se comporter (ne pas inventer,
        ne pas donner d&apos;avis sur les projets, renvoyer vers un script doctor…) : ces règles
        sont déjà en place.
      </p>

      {enregistre && <p className={styles.ok}>Enregistré. Le tchat en tient compte dès maintenant.</p>}
      {retour && <p className={styles.ok}>Version précédente rétablie.</p>}
      {erreur && <p className={formStyles.error}>{erreur}</p>}

      <form action={enregistrerConnaissances} className={formStyles.form} style={{ marginTop: 20 }}>
        <textarea name="texte" defaultValue={texte} rows={32} className={styles.texte} required />
        <div className={styles.pied}>
          <button type="submit" className={formStyles.submit}>
            Enregistrer
          </button>
          {date && (
            <span className={formStyles.hint}>
              Dernière modification le {date}
              {ligne?.profil?.full_name ? ` par ${ligne.profil.full_name}` : ""}.
            </span>
          )}
        </div>
      </form>

      {ligne?.texte_precedent && (
        <form action={revenirVersionPrecedente} style={{ marginTop: 16 }}>
          <button type="submit" className={styles.lien}>
            Revenir à la version précédente
          </button>
        </form>
      )}
    </PageShell>
  );
}
