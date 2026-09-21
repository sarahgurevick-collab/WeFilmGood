import Link from "next/link";
import { redirect } from "next/navigation";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import BlocProfil from "../BlocProfil";
import { saveParcours } from "../actions";
import { metiersPourCategorie } from "../metiers";
import styles from "../profil.module.css";
import ReseauxSociaux from "./ReseauxSociaux";

const RESEAUX = [
  { slug: "vimeo", label: "Vimeo" },
  { slug: "linkedin", label: "LinkedIn" },
  { slug: "viadeo", label: "Viadeo" },
  { slug: "instagram", label: "Instagram" },
];

export default async function ParcoursPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?next=/profil/parcours");

  const [{ data: profil }, { data: liens }, { data: metiers }, { data: langues }, { data: toutesLangues }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("category, biofilmo, website, agent_name")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("profile_social_links").select("network, url").eq("profile_id", user.id),
      supabase.from("profile_roles").select("role_slug").eq("profile_id", user.id),
      supabase.from("profile_languages").select("language_code").eq("profile_id", user.id),
      supabase.from("languages").select("code, label_fr").order("position"),
    ]);
  const aLangue = (code: string) => (langues ?? []).some((l) => l.language_code === code);
  const valeursReseaux = Object.fromEntries((liens ?? []).map((l) => [l.network, l.url]));
  // Un auteur n'a pas à prouver une expérience professionnelle du cinéma —
  // c'est justement ce qu'on lui dit dans la biofilmographie. Cette
  // indication ne s'adresse qu'aux producteurs et aux autres talents.
  const demandeReference = profil?.category === "producteur" || profil?.category === "talent";

  // Les métiers proposés dépendent de la catégorie choisie en bloc 1 :
  // quatre métiers d'écriture pour un auteur, les métiers du plateau et
  // de la fabrication pour un producteur ou un autre talent. On les
  // affiche dans cet ordre précis, pas celui de la table.
  const slugsProposes = metiersPourCategorie(profil?.category);
  const { data: labels } = slugsProposes.length
    ? await supabase.from("roles").select("slug, label_fr").in("slug", slugsProposes)
    : { data: [] as { slug: string; label_fr: string }[] };
  const labelDe = new Map((labels ?? []).map((r) => [r.slug, r.label_fr]));
  const metiersAffiches = slugsProposes
    .map((slug) => ({ slug, label: labelDe.get(slug) }))
    .filter((m): m is { slug: string; label: string } => !!m.label);
  const aMetier = (slug: string) => (metiers ?? []).some((m) => m.role_slug === slug);

  return (
    <BlocProfil actif="parcours">
      <p className={formStyles.hint}>
        Visible par les membres connectés.
      </p>

      <form className={formStyles.form} action={saveParcours} style={{ marginTop: 24 }}>
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <label className={formStyles.field}>
          <span>Biofilmographie</span>
          <textarea
            name="biofilmo"
            rows={6}
            required
            defaultValue={profil?.biofilmo ?? ""}
            placeholder="Pas d'expérience dans le cinéma ? Aucune importance. Ce qui a de la valeur, c'est votre expérience de la vie. Joyeuse, parfois douloureuse, toujours précieuse. Racontez la vôtre ici."
          />
        </label>

        {metiersAffiches.length > 0 ? (
          <div className={formStyles.field}>
            <span>Mes métiers (plusieurs choix possibles)</span>
            <div className={formStyles.roles}>
              {metiersAffiches.map((m) => (
                <label key={m.slug} className={formStyles.role}>
                  <input type="checkbox" name="roles" value={m.slug} defaultChecked={aMetier(m.slug)} />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <p className={formStyles.hint}>
            Choisissez d&apos;abord votre catégorie dans le bloc{" "}
            <Link href="/profil/identite">Qui êtes-vous ?</Link> pour voir vos métiers
            proposés ici.
          </p>
        )}

        <div className={formStyles.field}>
          <span>Langues parlées</span>
          <div className={formStyles.roles}>
            {(toutesLangues ?? []).map((l) => (
              <label key={l.code} className={formStyles.role}>
                <input type="checkbox" name="languages" value={l.code} defaultChecked={aLangue(l.code)} />
                {l.label_fr}
              </label>
            ))}
          </div>
        </div>

        <label className={formStyles.field}>
          <span>{demandeReference ? "Votre référence professionnelle" : "Votre référence professionnelle, si vous en avez une"}</span>
          <input
            type="url"
            name="website"
            defaultValue={profil?.website ?? ""}
            placeholder="https://www.imdb.com/name/…"
          />
          {demandeReference && (
            <span className={formStyles.hint}>
              Votre page IMDb, votre Vimeo ou votre site personnel — de quoi montrer au
              moins une expérience sur un film, un court métrage ou un clip. C&apos;est ce
              qui distingue les professionnels sur la plateforme.
            </span>
          )}
        </label>
        <label className={formStyles.field}>
          <span>Nom de votre agent, si vous en avez un</span>
          <input type="text" name="agent_name" defaultValue={profil?.agent_name ?? ""} />
        </label>

        <ReseauxSociaux reseaux={RESEAUX} valeurs={valeursReseaux} />

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
