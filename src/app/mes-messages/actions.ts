"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { envoyerEmail } from "@/lib/brevo";
import { emailDuMembre } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Écrire à l'auteur d'un projet, ou répondre dans une conversation (03/10) :
 * le même envoi, les règles sont dans la base (envoyer_message). Le message part toujours ; son
 * destinataire ne pourra le lire que si son adhésion est active, et sans
 * adhésion il ne saura pas qui lui a écrit.
 */
export async function ecrire(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projectId = ((formData.get("project_id") as string) || "").trim() || null;
  const recipientId = formData.get("recipient_id") as string;
  const body = (formData.get("body") as string)?.trim();
  // L'objet d'un premier message hors projet (10/10) : le titre de son projet, le plus souvent.
  const objet = ((formData.get("objet") as string) || "").trim() || null;
  // Où revenir après l'envoi : la fiche du projet, le profil du talent, ou
  // la conversation (une réponse). Jamais une adresse venue du formulaire.
  const retour = formData.get("retour") as string;

  const ici =
    retour === "conversation"
      ? `/mes-messages/avec/${recipientId}${projectId ? `?projet=${projectId}` : ""}`
      : retour === "membre"
        ? `/mes-messages/nouveau?membre=${recipientId}`
        : `/mes-messages/nouveau?projet=${projectId}`;
  const avecParametre = (adresse: string, cle: string, valeur: string) =>
    `${adresse}${adresse.includes("?") ? "&" : "?"}${cle}=${valeur}`;

  if (!user) redirect(`/connexion?next=${encodeURIComponent(ici)}`);
  if (!body) redirect(avecParametre(ici, "message", "vide"));
  if (retour === "membre" && !projectId && !objet) redirect(avecParametre(ici, "message", "objet"));

  const { error } = await supabase.rpc("envoyer_message", {
    p_destinataire: recipientId,
    p_projet: projectId,
    p_corps: body,
    p_objet: objet,
  });
  if (error) {
    // Écrire demande une adhésion (02/10) ; l'administration passe.
    if (error.message.includes("adhésion")) redirect("/adhesion");
    // Messagerie fermée entre l'ouverture de l'écran et l'envoi : retour à la fiche, ou au profil.
    if (error.message.includes("indisponible")) redirect(projectId ? `/projet/${projectId}` : `/membres/${recipientId}`);
    if (error.message.includes("objet")) redirect(avecParametre(ici, "message", "objet"));
    console.error("Envoi du message refusé :", error.message);
    redirect("/mes-messages");
  }

  // On prévient, on ne raconte pas : ni le message, ni son auteur. Le
  // destinataire vient le lire sur la plateforme, ce qui laisse jouer la
  // règle d'adhésion. Libre aux deux membres d'échanger ensuite leurs
  // adresses pour continuer ailleurs.
  const destinataire = await emailDuMembre(recipientId);
  if (destinataire) {
    const entetes = await headers();
    const hote = entetes.get("host") ?? "app.wefilmgood.com";
    const origine = `${hote.startsWith("localhost") ? "http" : "https"}://${hote}`;

    await envoyerEmail({
      to: [{ email: destinataire }],
      subject: "Vous avez reçu un message sur WeFilmGood",
      htmlContent: `
        <p>Bonjour,</p>
        <p>Vous avez reçu un message sur WeFilmGood.</p>
        <p><a href="${origine}/mes-messages">Le consulter</a></p>
      `,
    });
  }

  revalidatePath("/mes-messages");
  if (projectId) revalidatePath(`/projet/${projectId}`);

  // On revient là où on a décidé d'écrire (03/10, Sarah) : la fiche du projet ;
  // une réponse reste dans sa conversation.
  if (retour === "conversation") redirect(ici);
  if (retour === "membre" || !projectId) redirect(`/membres/${recipientId}?message=envoye`);
  redirect(`/projet/${projectId}?message=envoye`);
}
