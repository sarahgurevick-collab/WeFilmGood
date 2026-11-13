import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { peutDeposerComedyPitch } from "@/lib/comedypitch";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import EnvoiComedyPitch from "./EnvoiComedyPitch";

export const metadata = { title: "ComedyPitch", robots: { index: false } };

/**
 * Déposer et suivre son ComedyPitch pour un personnage (13/11/2026).
 * On y arrive par le bouton « Déposer mon ComedyPitch » de la carte du
 * personnage, ou par les e-mails. Textes validés par Sarah le 12/11.
 */
export default async function ComedyPitchPage({
  params,
}: {
  params: Promise<{ id: string; personnageId: string }>;
}) {
  const { id, personnageId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/projet/${id}/comedypitch/${personnageId}`);
  const { data: estAdmin } = await supabase.rpc("is_admin");
  const admin = createAdminClient();
  if (!admin) notFound();

  // Le dépôt de ce comédien pour ce personnage : le plus récent d'abord
  // (un nouveau en attente passe devant celui qui est en ligne).
  const { data: depots } = await admin
    .from("videopitch_depots")
    .select("id, etat, motif_refus, project_id, cree_le")
    .eq("genre", "comedypitch")
    .eq("personnage_id", personnageId)
    .eq("deposant_id", user.id)
    .order("cree_le", { ascending: false })
    .returns<{ id: string; etat: string; motif_refus: string | null; project_id: string }[]>();
  const dernier = depots?.[0] ?? null;

  const acces = await peutDeposerComedyPitch(supabase, user.id, estAdmin === true, personnageId);
  // Celui qui a déjà déposé garde sa page de suivi, même s'il ne peut plus déposer.
  if (!acces && !dernier) notFound();
  if ((acces?.projet.id ?? dernier?.project_id) !== id) notFound();

  const { data: personnage } = await admin.from("characters").select("name").eq("id", personnageId).maybeSingle<{ name: string }>();
  if (!personnage) notFound();
  const fiche = `/projet/${id}?personnage=${personnageId}#personnages`;

  const suivi = (() => {
    switch (dernier?.etat) {
      case "recu":
      case "preparation":
        return "Vidéo reçue. Nous la préparons pour la lecture en ligne : cela prend quelques minutes.";
      case "a_valider":
        return "Votre ComedyPitch est visionné par l'équipe avant d'être mis en ligne.";
      case "refuse":
        return `Votre ComedyPitch n'a pas été retenu${dernier.motif_refus ? ` : ${dernier.motif_refus}` : ""}. Vous pouvez en envoyer un autre.`;
      case "echec":
        return "Nous n'avons pas réussi à lire cette vidéo. Réessayez avec un autre fichier, en MP4 de préférence.";
      default:
        return null;
    }
  })();
  const enAttente = dernier?.etat === "recu" || dernier?.etat === "preparation" || dernier?.etat === "a_valider";

  return (
    <PageShell title={`Votre ComedyPitch pour ${personnage.name}`} connecte nav="pitchotheque" theme="clair">
      <p style={{ margin: "0 0 14px" }}>Interprétez ce personnage face caméra, puis envoyez votre vidéo.</p>

      {dernier?.etat === "valide" && (
        <p className={formStyles.hint} style={{ color: "#1a1a1a" }}>
          ✓ Votre ComedyPitch est visible sur la fiche du personnage. <Link href={fiche}>Le voir</Link>
        </p>
      )}
      {suivi && (
        <p className={formStyles.hint} style={{ color: "#1a1a1a" }}>
          {suivi}
        </p>
      )}

      {acces && !enAttente && <EnvoiComedyPitch personnageId={personnageId} remplace={!!dernier} />}
    </PageShell>
  );
}
