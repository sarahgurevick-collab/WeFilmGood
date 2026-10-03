import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import styles from "./membre.module.css";
import ContactEnveloppe from "@/app/projet/[id]/ContactEnveloppe";
import profilStyles from "@/app/profil/profil.module.css";

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
 * pas publics. Le profil d'un lecteur n'est vu que de lui-même et de
 * l'administration : un auteur n'en connaît que le prénom, et ne doit pas
 * pouvoir le retrouver par ici.
 *
 * Comme dans la Galaxie de Talents (02/10, décision de Sarah) : pour un
 * autre membre, pas de nom, pas de site, pas de biographie (elle cite
 * souvent le nom), et la photo floutée dans l'image elle-même. Le membre lui-même et l'administration voient tout.
 */
export default async function ProfilMembrePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { id } = await params;
  const { message } = await searchParams;
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

  let masque = false;
  let estAdmin = false;
  if (membre.id !== user.id) {
    const [{ data: lecteur }, { data: isAdmin }] = await Promise.all([
      supabase
        .from("profile_roles")
        .select("role_slug")
        .eq("profile_id", membre.id)
        .eq("role_slug", "lecteur")
        .maybeSingle(),
      supabase.rpc("is_admin"),
    ]);
    if (lecteur && !isAdmin) notFound();
    masque = isAdmin !== true;
    estAdmin = isAdmin === true;
  }

  // L'enveloppe pour lui écrire (03/10) : barrée, avec sa bulle, sans adhésion.
  const peutEcrire = membre.id !== user.id;
  const { data: adherent } = peutEcrire
    ? await supabase.rpc("a_une_adhesion_active", { p_profile_id: user.id })
    : { data: null };

  const nom = masque ? "Membre" : (membre.display_name ?? membre.full_name ?? "Membre");

  return (
    <PageShell eyebrow="Membre" title={nom}>
      {message === "envoye" && <p className={profilStyles.ok}>Message envoyé.</p>}
      {/* La photo, ronde comme le logo. Sans photo, l'initiale. */}
      <div className={styles.photo} aria-hidden="true">
        {membre.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={masque ? `/api/talents/photo?id=${membre.id}` : membre.avatar_url} alt="" />
        ) : (
          !masque && <span>{nom.trim().charAt(0).toUpperCase()}</span>
        )}
      </div>

      {masque ? null : membre.biofilmo ? (
        <p style={{ marginTop: 24, whiteSpace: "pre-wrap" }}>{membre.biofilmo}</p>
      ) : (
        <p className={formStyles.hint} style={{ marginTop: 24 }}>
          Ce membre n&apos;a pas encore rédigé sa biographie.
        </p>
      )}

      {membre.website && !masque && (
        <p className={formStyles.linkRow} style={{ marginTop: 24 }}>
          <a href={membre.website} target="_blank" rel="noopener noreferrer">
            Son site
          </a>
        </p>
      )}

      {peutEcrire && (
        <div style={{ marginTop: 28 }}>
          <ContactEnveloppe
            href={`/mes-messages/nouveau?membre=${membre.id}`}
            adhesionRequise={adherent !== true && !estAdmin}
            phrase="Pour contacter ce membre, vous avez besoin d'une adhésion."
          />
        </div>
      )}
    </PageShell>
  );
}
