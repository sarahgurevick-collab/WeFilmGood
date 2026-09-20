"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { envoyerEmail } from "@/lib/brevo";
import { emailDuMembre } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Crée le lien de partage, ou le révoque — ce qui referme l'accès aux destinataires précédents. */
export async function setShareLink(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projectId = formData.get("project_id") as string;
  const actif = formData.get("actif") === "1";

  if (!user) {
    redirect(`/connexion?next=/projets/${projectId}`);
  }

  await supabase.rpc("set_project_share_token", {
    p_project_id: projectId,
    p_actif: actif,
  });

  revalidatePath(`/projets/${projectId}`);
}

/** Écrit à l'auteur d'un projet. Le message part toujours ; l'auteur ne pourra le lire que si son adhésion est active. */
export async function contacterAuteur(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const projectId = formData.get("project_id") as string;
  const recipientId = formData.get("recipient_id") as string;
  const body = (formData.get("body") as string)?.trim();

  if (!user) {
    redirect(`/connexion?next=/projets/${projectId}`);
  }
  if (!body) {
    redirect(`/projets/${projectId}?message=vide`);
  }

  await supabase.from("project_messages").insert({
    project_id: projectId,
    sender_id: user.id,
    recipient_id: recipientId,
    body,
  });

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

  revalidatePath(`/projets/${projectId}`);
  redirect(`/projets/${projectId}?message=envoye`);
}
