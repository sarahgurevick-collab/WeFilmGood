import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import styles from "./profil.module.css";
import { createClient } from "@/lib/supabase/server";
import {
  quitterLaPlateforme,
  saveKeywords,
  savePrivateDetails,
  savePublicInfo,
  saveTestimonial,
} from "./actions";

const RESEAUX = [
  { slug: "vimeo", label: "Vimeo" },
  { slug: "linkedin", label: "LinkedIn" },
  { slug: "viadeo", label: "Viadeo" },
  { slug: "instagram", label: "Instagram" },
];

export default async function ProfilPage({
  searchParams,
}: {
  searchParams: Promise<{ enregistre?: string }>;
}) {
  const { enregistre } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/profil");
  }

  const [
    { data: profile },
    { data: prive },
    { data: liens },
    { data: metiers },
    { data: langues },
    { data: genresChoisis },
    { data: tousMetiers },
    { data: toutesLangues },
    { data: tousGenres },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, display_name, category, validation_status, city, country, website, biofilmo, agent_name, testimonial, testimonial_is_public",
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profile_private_details")
      .select("address, postal_code, phone, birthdate, gender")
      .eq("profile_id", user.id)
      .maybeSingle(),
    supabase.from("profile_social_links").select("network, url").eq("profile_id", user.id),
    supabase.from("profile_roles").select("role_slug").eq("profile_id", user.id),
    supabase.from("profile_languages").select("language_code").eq("profile_id", user.id),
    supabase.from("profile_genres").select("genre_slug").eq("profile_id", user.id),
    supabase.from("roles").select("slug, label_fr").eq("is_public", true).order("position"),
    supabase.from("languages").select("code, label_fr").order("position"),
    supabase.from("genres").select("slug, label_fr").order("position"),
  ]);

  const lienDe = (network: string) =>
    (liens ?? []).find((l) => l.network === network)?.url ?? "";
  const aMetier = (slug: string) => (metiers ?? []).some((m) => m.role_slug === slug);
  const aLangue = (code: string) => (langues ?? []).some((l) => l.language_code === code);
  const aGenre = (slug: string) => (genresChoisis ?? []).some((g) => g.genre_slug === slug);

  const CATEGORIES: Record<string, string> = {
    auteur: "Auteur",
    producteur: "Producteur",
    talent: "Autre Talent",
  };

  return (
    <PageShell eyebrow="Mon profil" title={profile?.full_name ?? "Profil"} wide nav="profil" connecte>
      {enregistre && <p className={styles.ok}>Modifications enregistrées.</p>}

      <p className={formStyles.hint}>
        {CATEGORIES[profile?.category ?? ""] ?? "Catégorie non renseignée"}
        {profile?.validation_status === "en_attente" &&
          " — en attente de validation par un administrateur"}
      </p>

      <h2 className={styles.section}>Informations administratives</h2>
      <p className={formStyles.hint}>
        Visibles uniquement par l&apos;administration de WeFilmGood. Aucun
        autre membre n&apos;y a accès.
      </p>

      <form className={formStyles.form} action={savePrivateDetails} style={{ marginTop: 20 }}>
        <label className={formStyles.field}>
          <span>Adresse</span>
          <input type="text" name="address" defaultValue={prive?.address ?? ""} />
        </label>
        <div className={styles.row}>
          <label className={formStyles.field}>
            <span>Code postal</span>
            <input type="text" name="postal_code" defaultValue={prive?.postal_code ?? ""} />
          </label>
          <label className={formStyles.field}>
            <span>Ville</span>
            <input type="text" name="city" defaultValue={profile?.city ?? ""} />
          </label>
        </div>
        <div className={styles.row}>
          <label className={formStyles.field}>
            <span>Pays</span>
            <input type="text" name="country" defaultValue={profile?.country ?? ""} />
          </label>
          <label className={formStyles.field}>
            <span>Téléphone (avec indicatif)</span>
            <input type="tel" name="phone" defaultValue={prive?.phone ?? ""} placeholder="+33 6 12 34 56 78" />
          </label>
        </div>
        <div className={styles.row}>
          <label className={formStyles.field}>
            <span>Date de naissance</span>
            <input type="date" name="birthdate" defaultValue={prive?.birthdate ?? ""} />
          </label>
          <label className={formStyles.field}>
            <span>Genre</span>
            <select name="gender" defaultValue={prive?.gender ?? ""}>
              <option value="">Non renseigné</option>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
              <option value="autre">Autre</option>
            </select>
          </label>
        </div>
        <button type="submit" className={formStyles.submit}>
          Enregistrer
        </button>
      </form>

      <h2 className={styles.section}>Mieux vous connaître</h2>
      <p className={formStyles.hint}>
        Visible par les membres connectés. Un champ laissé vide n&apos;apparaît pas.
      </p>

      <form className={formStyles.form} action={savePublicInfo} style={{ marginTop: 20 }}>
        <label className={formStyles.field}>
          <span>Biofilmographie</span>
          <textarea name="biofilmo" rows={6} defaultValue={profile?.biofilmo ?? ""} />
        </label>
        <div className={styles.row}>
          <label className={formStyles.field}>
            <span>Votre référence professionnelle</span>
            <input
              type="url"
              name="website"
              defaultValue={profile?.website ?? ""}
              placeholder="https://www.imdb.com/name/…"
            />
            <span className={formStyles.hint}>
              Votre page IMDb, votre Vimeo ou votre site personnel — de quoi
              montrer au moins une expérience sur un film, un court métrage ou
              un clip. C&apos;est ce qui distingue les professionnels sur la
              plateforme.
            </span>
          </label>
          <label className={formStyles.field}>
            <span>Nom de votre agent</span>
            <input type="text" name="agent_name" defaultValue={profile?.agent_name ?? ""} />
          </label>
        </div>
        {RESEAUX.map((r) => (
          <label key={r.slug} className={formStyles.field}>
            <span>{r.label}</span>
            <input type="url" name={`social_${r.slug}`} defaultValue={lienDe(r.slug)} placeholder="https://" />
          </label>
        ))}
        <button type="submit" className={formStyles.submit}>
          Enregistrer
        </button>
      </form>

      <h2 className={styles.section}>Mon témoignage</h2>
      <p className={formStyles.hint}>
        Si vous cochez &laquo;&nbsp;rendre public&nbsp;&raquo;, votre photo de
        profil et ce texte apparaissent sur la page{" "}
        <Link href="/temoignages">Témoignages</Link>, visible par tous, même
        sans connexion.
      </p>

      <form className={formStyles.form} action={saveTestimonial} style={{ marginTop: 20 }}>
        <label className={formStyles.field}>
          <span>Votre témoignage</span>
          <textarea
            name="testimonial"
            rows={4}
            defaultValue={profile?.testimonial ?? ""}
            placeholder="Ce que WeFilmGood vous a apporté..."
          />
        </label>
        <label className={formStyles.checkline}>
          <input
            type="checkbox"
            name="testimonial_is_public"
            value="1"
            defaultChecked={profile?.testimonial_is_public ?? false}
          />
          <span>Rendre mon témoignage public</span>
        </label>
        <button type="submit" className={formStyles.submit}>
          Enregistrer
        </button>
      </form>

      <h2 className={styles.section}>Mes mots clés</h2>
      <p className={formStyles.hint}>
        Ils permettent aux autres talents de vous trouver.
      </p>

      <form className={formStyles.form} action={saveKeywords} style={{ marginTop: 20 }}>
        <div className={formStyles.field}>
          <span>Mes métiers</span>
          <div className={formStyles.roles}>
            {(tousMetiers ?? []).map((m) => (
              <label key={m.slug} className={formStyles.role}>
                <input type="checkbox" name="roles" value={m.slug} defaultChecked={aMetier(m.slug)} />
                {m.label_fr}
              </label>
            ))}
          </div>
        </div>

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

        <div className={formStyles.field}>
          <span>Mes genres de prédilection</span>
          <div className={formStyles.roles}>
            {(tousGenres ?? []).map((g) => (
              <label key={g.slug} className={formStyles.role}>
                <input type="checkbox" name="genres" value={g.slug} defaultChecked={aGenre(g.slug)} />
                {g.label_fr}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className={formStyles.submit}>
          Enregistrer
        </button>
      </form>

      <form action="/deconnexion" method="post" style={{ marginTop: 20 }}>
        <button type="submit" className={formStyles.submit}>
          Se déconnecter
        </button>
      </form>

      <h2 className={styles.section}>Quitter la plateforme</h2>
      <p className={formStyles.hint}>
        Votre accès est fermé et votre profil retiré de l&apos;annuaire : plus
        personne ne peut vous contacter. Vos projets restent en ligne et
        gardent votre nom — c&apos;est ce qui permet à WeFilmGood de vous
        prévenir si un producteur s&apos;y intéresse. Revenir est possible à
        tout moment.
      </p>
      <p className={formStyles.hint} style={{ marginTop: 12 }}>
        Pour un effacement définitif de vos données personnelles,{" "}
        <Link href="/cguv">écrivez-nous</Link> : nous ne pourrons alors plus
        vous joindre, même si un producteur cherche à vous parler.
      </p>

      <form action={quitterLaPlateforme} className={formStyles.form} style={{ marginTop: 20 }}>
        <label className={formStyles.field}>
          <span>Pourquoi partez-vous ? (facultatif)</span>
          <textarea name="reason" rows={3} />
        </label>
        <label className={formStyles.checkline}>
          <input type="checkbox" name="confirmation" value="1" required />
          <span>Je confirme vouloir fermer mon accès à WeFilmGood.</span>
        </label>
        <button type="submit" className={formStyles.submit}>
          Fermer mon accès
        </button>
      </form>
    </PageShell>
  );
}
