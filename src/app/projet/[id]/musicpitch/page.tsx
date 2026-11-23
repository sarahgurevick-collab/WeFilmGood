import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { dernierMusicPitch, peutDeposerMusicPitch, seRenvoie } from "@/lib/musicpitch";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import EnvoiMusicPitch from "./EnvoiMusicPitch";

export const metadata = { title: "MusicPitch", robots: { index: false } };

/**
 * Déposer et suivre son MusicPitch pour un projet (23/11/2026, 0323). On y
 * arrive par le bouton « Déposer mon MusicPitch » de la fiche projet, ou
 * par les e-mails. Textes repris de ceux du ComedyPitch, adaptés au son :
 * À FAIRE VALIDER par Sarah. Tant que le dépôt n'est pas ouvert
 * (MUSICPITCH_OUVERT), seule l'administration voit cette page.
 */
export default async function MusicPitchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/projet/${id}/musicpitch`);
  const { data: estAdmin } = await supabase.rpc("is_admin");
  const admin = createAdminClient();
  if (!admin) notFound();

  const [dernier, acces] = await Promise.all([
    dernierMusicPitch(user.id, id),
    peutDeposerMusicPitch(supabase, user.id, estAdmin === true, id),
  ]);
  // Celui qui a déjà déposé garde sa page de suivi, même s'il ne peut plus déposer.
  if (!acces && !dernier) notFound();

  const { data: projet } = await admin.from("projects").select("title").eq("id", id).maybeSingle<{ title: string }>();
  if (!projet) notFound();
  // « L'écouter » : sur la fiche si la base la lui ouvre encore ; sinon sur
  // son propre profil, où son MusicPitch figure aussi.
  const { data: ficheOuverte } = await supabase.from("projects").select("id").eq("id", id).maybeSingle();
  const fiche = ficheOuverte ? `/projet/${id}#musicpitch` : `/membres/${user.id}`;

  const suivi = (() => {
    switch (dernier?.etat) {
      case "recu":
      case "preparation":
        return "Fichier reçu. Nous le préparons pour l'écoute en ligne : cela prend quelques minutes.";
      case "a_valider":
        return "Votre MusicPitch est écouté par l'équipe avant d'être mis en ligne.";
      case "refuse":
        return `Votre MusicPitch n'a pas été retenu${dernier.motif_refus ? ` : ${dernier.motif_refus}` : ""}. Vous pouvez en envoyer un autre.`;
      case "echec":
        return "Nous n'avons pas réussi à lire ce fichier. Réessayez avec un autre fichier, en MP3 de préférence.";
      default:
        return null;
    }
  })();
  const enAttente = dernier?.etat === "recu" || dernier?.etat === "preparation" || dernier?.etat === "a_valider";

  return (
    <PageShell title={`Votre MusicPitch pour « ${projet.title} »`} connecte nav="pitchotheque" theme="clair">
      <p style={{ margin: "0 0 14px" }}>Composez un thème ou une chanson pour ce projet, puis envoyez votre fichier son.</p>

      {dernier?.etat === "valide" && (
        <p className={formStyles.hint} style={{ color: "#1a1a1a" }}>
          ✓ Votre MusicPitch est en ligne sur la fiche du projet. <Link href={fiche}>L&apos;écouter</Link>
        </p>
      )}
      {suivi && (
        <p className={formStyles.hint} style={{ color: "#1a1a1a" }}>
          {suivi}
        </p>
      )}

      {(acces || seRenvoie(dernier?.etat)) && !enAttente && <EnvoiMusicPitch projectId={id} remplace={!!dernier} />}
    </PageShell>
  );
}
