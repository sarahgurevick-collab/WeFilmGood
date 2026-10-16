import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { LANGUES_LECTURE, nomDeLangue } from "@/lib/langues";
import { createClient } from "@/lib/supabase/server";
import ChampPhoto from "@/app/profil/identite/ChampPhoto";
import profilStyles from "@/app/profil/profil.module.css";
import { choisirLanguesLues } from "../actions";
import styles from "../lecteur.module.css";

/**
 * Le profil d'un lecteur : les langues qu'il accepte de lire. Ce sont elles
 * qui décident des projets qu'on lui propose (administration, « Attribuer »).
 */
export default async function ProfilLecteurPage({
  searchParams,
}: {
  searchParams: Promise<{ enregistre?: string; photo?: string; erreur?: string }>;
}) {
  const { enregistre, photo, erreur } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/lecteur/profil");

  const { data: profil } = await supabase
    .from("profiles")
    .select("avatar_url, first_name, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: fiche } = await supabase
    .from("reader_profiles")
    .select("langues")
    .eq("profile_id", user.id)
    .maybeSingle<{ langues: string[] | null }>();
  // Rien de coché n'a jamais été enregistré : toutes les langues le sont.
  const cochees = fiche?.langues ?? LANGUES_LECTURE;

  return (
    <PageShell title="Mon profil" nav="profil" theme="clair">
      {/* La photo a son propre envoi : elle part dès qu'on la choisit. */}
      {erreur && <p className={formStyles.error}>{erreur}</p>}
      {photo && <p className={profilStyles.ok}>Photo enregistrée.</p>}
      <ChampPhoto
        photo={profil?.avatar_url ?? null}
        initiale={(profil?.first_name ?? profil?.full_name ?? "?").trim().charAt(0).toUpperCase()}
        retour="/lecteur/profil"
      />

      <form className={formStyles.form} action={choisirLanguesLues} style={{ marginTop: 32 }}>
        <fieldset className={styles.langues}>
          <legend>Langues que j&apos;accepte de lire</legend>
          {LANGUES_LECTURE.map((code) => (
            <label key={code} className={styles.langue}>
              <input type="checkbox" name="langue" value={code} defaultChecked={cochees.includes(code)} />
              {nomDeLangue(code)}
            </label>
          ))}
        </fieldset>

        {enregistre && <p className={formStyles.hint}>Enregistré.</p>}
        <button type="submit" className={formStyles.submit}>
          Enregistrer
        </button>
      </form>
    </PageShell>
  );
}
