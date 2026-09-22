import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import styles from "./membre.module.css";

type Membre = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  biofilmo: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  avatar_url: string | null;
};

/**
 * Le profil d'un autre membre.
 *
 * Réservé aux membres connectés, comme l'annuaire : les profils ne sont
 * pas publics. Rien d'ici ne concerne les lecteurs — leur identité reste
 * protégée, un auteur n'en connaît que le prénom.
 */
export default async function ProfilMembrePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/membres/${id}`);

  const { data: membre } = await supabase
    .from("profiles")
    .select("id, full_name, display_name, biofilmo, website, avatar_url")
    .eq("id", id)
    .maybeSingle<Membre>();

  if (!membre) notFound();

  const nom = membre.display_name ?? membre.full_name ?? "Membre";

  return (
    <PageShell eyebrow="Membre" title={nom}>
      {/* La photo, ronde comme le logo. Sans photo, l'initiale. */}
      <div className={styles.photo} aria-hidden="true">
        {membre.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={membre.avatar_url} alt="" />
        ) : (
          <span>{nom.trim().charAt(0).toUpperCase()}</span>
        )}
      </div>

      {membre.biofilmo ? (
        <p style={{ marginTop: 24, whiteSpace: "pre-wrap" }}>{membre.biofilmo}</p>
      ) : (
        <p className={formStyles.hint} style={{ marginTop: 24 }}>
          Ce membre n&apos;a pas encore rédigé sa biographie.
        </p>
      )}

      {membre.website && (
        <p className={formStyles.linkRow} style={{ marginTop: 24 }}>
          <a href={membre.website} target="_blank" rel="noopener noreferrer">
            Son site
          </a>
        </p>
      )}
    </PageShell>
  );
}
