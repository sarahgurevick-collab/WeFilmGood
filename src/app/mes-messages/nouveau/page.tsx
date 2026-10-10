import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { ecrire } from "../actions";
import { createClient } from "@/lib/supabase/server";

/**
 * Écrire à l'auteur d'un projet — dans l'onglet Messages, et non plus sur
 * la fiche projet (décision de Sarah, 26/09/2026) : la fiche n'a plus
 * qu'une enveloppe qui mène ici, le projet déjà indiqué (03/10).
 *
 * Depuis le 10/10 (Sarah), on écrit aussi à un talent depuis son profil,
 * sans projet : le message porte alors un objet, le titre de son projet le
 * plus souvent. Ce contact comptera comme un crédit quand les crédits
 * existeront.
 */
export default async function NouveauMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ projet?: string; membre?: string; message?: string }>;
}) {
  const { projet: projectId, membre: membreId, message } = await searchParams;
  if (!projectId && !membreId) redirect("/mes-messages");
  const ici = projectId ? `/mes-messages/nouveau?projet=${projectId}` : `/mes-messages/nouveau?membre=${membreId}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=${encodeURIComponent(ici)}`);

  // Écrire demande une adhésion (02/10) ; l'administration passe.
  const [{ data: adherent }, { data: estAdmin }] = await Promise.all([
    supabase.rpc("a_une_adhesion_active", { p_profile_id: user.id }),
    supabase.rpc("is_admin"),
  ]);

  const { data: projet } = projectId
    ? await supabase
        .from("projects")
        .select("id, title, owner_id")
        .eq("id", projectId)
        .maybeSingle<{ id: string; title: string; owner_id: string }>()
    : { data: null };
  if (projectId && !projet) notFound();

  const destinataireId = projet?.owner_id ?? (membreId as string);
  // Soi-même : rien à s'écrire.
  if (destinataireId === user.id) redirect(projet ? `/projet/${projet.id}` : "/profil");
  if (adherent !== true && estAdmin !== true) redirect("/adhesion");

  const { data: destinataire } = await supabase
    .from("profiles")
    .select("id, first_name, full_name")
    .eq("id", destinataireId)
    .maybeSingle<{ id: string; first_name: string | null; full_name: string | null }>();
  if (!destinataire) notFound();

  // Messagerie fermée : pas d'écran d'écriture, on revient d'où l'on vient (l'enveloppe y est barrée).
  const { data: fermee } = await supabase.rpc("messagerie_fermee", { uid: destinataireId });
  if (fermee === true) redirect(projet ? `/projet/${projet.id}` : `/membres/${destinataireId}`);

  const prenom = destinataire.first_name ?? destinataire.full_name ?? (projet ? "l'auteur" : "ce membre");
  const titre = `Écrire à ${prenom}`;

  return (
    <PageShell eyebrow="Mes messages" title={titre} connecte nav="messages">
      {projet ? (
        <p className={formStyles.hint}>
          À propos de «{" "}
          <Link href={`/projet/${projet.id}`}>{projet.title}</Link> ». L&apos;auteur est prévenu
          par email et vient lire votre message sur la plateforme.
        </p>
      ) : (
        <p className={formStyles.hint}>
          {prenom} est prévenu·e par email et vient lire votre message sur la plateforme.
        </p>
      )}

      {message === "vide" && (
        <p className={formStyles.hint} style={{ color: "#b3261e" }}>
          Le message ne peut pas être vide.
        </p>
      )}
      {message === "objet" && (
        <p className={formStyles.hint} style={{ color: "#b3261e" }}>
          Indiquez l&apos;objet de votre message.
        </p>
      )}

      <form action={ecrire} className={formStyles.form} style={{ marginTop: 16 }}>
        <input type="hidden" name="project_id" value={projet?.id ?? ""} />
        <input type="hidden" name="recipient_id" value={destinataireId} />
        <input type="hidden" name="retour" value={projet ? "projet" : "membre"} />
        {!projet && (
          <label className={formStyles.field}>
            <span>Objet</span>
            <input type="text" name="objet" required maxLength={120} placeholder="Le titre de votre projet" autoFocus />
          </label>
        )}
        <label className={formStyles.field}>
          <span>Votre message</span>
          <textarea name="body" rows={6} required autoFocus={Boolean(projet)} />
        </label>
        <button type="submit" className={formStyles.submit}>
          Envoyer
        </button>
      </form>
    </PageShell>
  );
}
