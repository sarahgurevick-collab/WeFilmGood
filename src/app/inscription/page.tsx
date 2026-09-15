import Link from "next/link";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { signUp } from "./actions";

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erreur?: string; envoye?: string }>;
}) {
  const { next, erreur, envoye } = await searchParams;
  const nextPath = next ?? "/";

  if (envoye) {
    return (
      <PageShell eyebrow="Authentification" title="Vérifie ta boîte mail">
        <p className={formStyles.hint}>
          Un email de confirmation vient de t&apos;être envoyé. Clique sur le
          lien qu&apos;il contient pour activer ton compte, puis reviens te{" "}
          <Link href="/connexion">connecter</Link>.
        </p>
      </PageShell>
    );
  }

  const supabase = await createClient();
  const { data: roles } = await supabase
    .from("roles")
    .select("slug, label_fr")
    .eq("is_public", true)
    .order("position", { ascending: true });

  return (
    <PageShell eyebrow="Authentification" title="Créer un profil">
      <form className={formStyles.form} action={signUp}>
        <input type="hidden" name="next" value={nextPath} />
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <label className={formStyles.field}>
          <span>Nom complet</span>
          <input type="text" name="full_name" required autoComplete="name" />
        </label>
        <label className={formStyles.field}>
          <span>Email</span>
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label className={formStyles.field}>
          <span>Mot de passe</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>

        <div className={formStyles.field}>
          <span>Catégorie de profil</span>
          <div className={formStyles.roles}>
            <label className={formStyles.role}>
              <input type="radio" name="category" value="auteur" required defaultChecked />
              Auteur
            </label>
            <label className={formStyles.role}>
              <input type="radio" name="category" value="producteur" />
              Producteur
            </label>
            <label className={formStyles.role}>
              <input type="radio" name="category" value="talent" />
              Autres Talents
            </label>
          </div>
          <span className={formStyles.hint}>
            Le profil Auteur est actif immédiatement. Les profils Producteur et
            Autres Talents doivent être validés par un administrateur.
          </span>
        </div>

        <div className={formStyles.field}>
          <span>Je crée mon profil en tant que</span>
          <div className={formStyles.roles}>
            {(roles ?? []).map((r) => (
              <label key={r.slug} className={formStyles.role}>
                <input type="checkbox" name="roles" value={r.slug} />
                {r.label_fr}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className={formStyles.submit}>
          Rejoindre le réseau
        </button>

        <p className={formStyles.linkRow}>
          Déjà un compte ?{" "}
          <Link href={`/connexion?next=${encodeURIComponent(nextPath)}`}>
            Se connecter
          </Link>
        </p>
      </form>
    </PageShell>
  );
}
