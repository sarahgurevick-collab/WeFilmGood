import Link from "next/link";
import { redirect } from "next/navigation";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import BlocProfil from "../BlocProfil";
import { saveParcours } from "../actions";
import styles from "../profil.module.css";

const RESEAUX = [
  { slug: "vimeo", label: "Vimeo" },
  { slug: "linkedin", label: "LinkedIn" },
  { slug: "viadeo", label: "Viadeo" },
  { slug: "instagram", label: "Instagram" },
];

export default async function ParcoursPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/profil/parcours");

  const [{ data: profil }, { data: liens }] = await Promise.all([
    supabase
      .from("profiles")
      .select("biofilmo, website, agent_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("profile_social_links").select("network, url").eq("profile_id", user.id),
  ]);
  const lienDe = (network: string) =>
    (liens ?? []).find((l) => l.network === network)?.url ?? "";

  return (
    <BlocProfil actif="parcours">
      <p className={formStyles.hint}>
        Visible par les membres connectés. Un champ laissé vide n&apos;apparaît pas.
      </p>

      <form className={formStyles.form} action={saveParcours} style={{ marginTop: 24 }}>
        <label className={formStyles.field}>
          <span>Biofilmographie</span>
          <textarea name="biofilmo" rows={6} defaultValue={profil?.biofilmo ?? ""} />
        </label>
        <label className={formStyles.field}>
          <span>Votre référence professionnelle</span>
          <input
            type="url"
            name="website"
            defaultValue={profil?.website ?? ""}
            placeholder="https://www.imdb.com/name/…"
          />
          <span className={formStyles.hint}>
            Votre page IMDb, votre Vimeo ou votre site personnel — de quoi montrer au
            moins une expérience sur un film, un court métrage ou un clip. C&apos;est ce
            qui distingue les professionnels sur la plateforme.
          </span>
        </label>
        <label className={formStyles.field}>
          <span>Nom de votre agent</span>
          <input type="text" name="agent_name" defaultValue={profil?.agent_name ?? ""} />
        </label>
        <div className={styles.row}>
          {RESEAUX.slice(0, 2).map((r) => (
            <label key={r.slug} className={formStyles.field}>
              <span>{r.label}</span>
              <input type="url" name={`social_${r.slug}`} defaultValue={lienDe(r.slug)} placeholder="https://" />
            </label>
          ))}
        </div>
        <div className={styles.row}>
          {RESEAUX.slice(2).map((r) => (
            <label key={r.slug} className={formStyles.field}>
              <span>{r.label}</span>
              <input type="url" name={`social_${r.slug}`} defaultValue={lienDe(r.slug)} placeholder="https://" />
            </label>
          ))}
        </div>

        <div className={styles.pied}>
          <Link href="/profil" className={styles.lienDiscret}>
            Passer ce bloc
          </Link>
          <button type="submit" className={styles.bouton}>
            Enregistrer et continuer →
          </button>
        </div>
      </form>
    </BlocProfil>
  );
}
