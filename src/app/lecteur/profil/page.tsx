import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { LANGUES_LECTURE, nomDeLangue } from "@/lib/langues";
import { createClient } from "@/lib/supabase/server";
import ChampPhoto from "@/app/profil/identite/ChampPhoto";
import { urlOriginal } from "@/app/profil/identite/original";
import profilStyles from "@/app/profil/profil.module.css";
import { PAYS } from "@/lib/pays";
import { choisirLanguesLues, enregistrerCoordonneesLecteur } from "../actions";
import styles from "../lecteur.module.css";
import { photoNette } from "@/lib/photo";

/**
 * Le profil d'un lecteur : les langues qu'il accepte de lire. Ce sont elles
 * qui décident des projets qu'on lui propose (administration, « Attribuer »).
 */
export default async function ProfilLecteurPage({
  searchParams,
}: {
  searchParams: Promise<{ enregistre?: string; photo?: string; cadrage?: string; erreur?: string; coordonnees?: string }>;
}) {
  const { enregistre, photo, cadrage, erreur, coordonnees } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/lecteur/profil");

  const { data: profil } = await supabase
    .from("profiles")
    .select("avatar_url, avatar_original_path, photo_x, photo_y, first_name, last_name, full_name, city, country")
    .eq("id", user.id)
    .maybeSingle();

  const { data: prive } = await supabase
    .from("profile_private_details")
    .select("phone, address, postal_code")
    .eq("profile_id", user.id)
    .maybeSingle<{ phone: string | null; address: string | null; postal_code: string | null }>();

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
      {cadrage && <p className={profilStyles.ok}>Cadrage enregistré.</p>}
      <ChampPhoto
        photo={photoNette(profil?.avatar_url)}
        original={urlOriginal(supabase, profil?.avatar_original_path)}
        x={profil?.photo_x ?? 50}
        y={profil?.photo_y ?? 20}
        initiale={(profil?.first_name ?? profil?.full_name ?? "?").trim().charAt(0).toUpperCase()}
        retour="/lecteur/profil"
      />

      {/* Les coordonnées du lecteur (04/11, Sarah) : réservées à l'équipe. */}
      <form id="coordonnees" className={formStyles.form} action={enregistrerCoordonneesLecteur} style={{ marginTop: 32 }}>
        <fieldset className={styles.langues}>
          <legend>Mes coordonnées</legend>
          <p className={formStyles.hint}>
            Les informations ci-dessous sont réservées uniquement à l&apos;équipe de la Maison des
            Scénaristes/WeFilmGood afin de vous joindre. Aucun talent connecté à la plateforme ne
            peut les voir.
          </p>
          <div className={styles.coordonnees}>
            <label className={formStyles.field}>
              <span>Prénom</span>
              <input type="text" name="first_name" required autoComplete="given-name" defaultValue={profil?.first_name ?? ""} />
            </label>
            <label className={formStyles.field}>
              <span>Nom</span>
              <input type="text" name="last_name" required autoComplete="family-name" defaultValue={profil?.last_name ?? ""} />
            </label>
            <label className={formStyles.field}>
              <span>Téléphone (avec indicatif)</span>
              <input type="tel" name="phone" autoComplete="tel" placeholder="+33 6 12 34 56 78" defaultValue={prive?.phone ?? ""} />
            </label>
            <label className={formStyles.field}>
              <span>Adresse</span>
              <input type="text" name="address" required autoComplete="street-address" defaultValue={prive?.address ?? ""} />
            </label>
            <label className={formStyles.field}>
              <span>Code postal</span>
              <input type="text" name="postal_code" required autoComplete="postal-code" defaultValue={prive?.postal_code ?? ""} />
            </label>
            <label className={formStyles.field}>
              <span>Ville</span>
              <input type="text" name="city" required autoComplete="address-level2" defaultValue={profil?.city ?? ""} />
            </label>
            <label className={formStyles.field}>
              <span>Pays</span>
              <select name="country" required defaultValue={profil?.country?.toUpperCase() ?? ""}>
                <option value="" disabled>
                  Choisir un pays
                </option>
                {PAYS.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.nom}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
        {coordonnees && <p className={formStyles.hint}>Enregistré.</p>}
        <button type="submit" className={formStyles.submit}>
          Enregistrer
        </button>
      </form>

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
