"use server";

import { createClient } from "@/lib/supabase/server";
import { envoyerEmail } from "@/lib/brevo";

const ADMIN_EMAIL = process.env.BREVO_SENDER_EMAIL || "";

export async function envoyerMessageContact(formData: FormData) {
  const nom = (formData.get("nom") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const message = (formData.get("message") as string)?.trim();

  // Piège à robots : un champ invisible que seul un bot remplit.
  if (formData.get("site_web")) {
    return { ok: true };
  }

  if (!email || !message) {
    return { ok: false, erreur: "Email et message sont obligatoires." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("envoyer_message_contact", {
    p_nom: nom,
    p_email: email,
    p_message: message,
  });

  if (error) {
    return { ok: false, erreur: "L'envoi a échoué, réessayez dans un instant." };
  }

  await envoyerEmail({
    to: [{ email: ADMIN_EMAIL }],
    replyTo: { email, name: nom || undefined },
    subject: `Nouveau message de contact${nom ? ` de ${nom}` : ""}`,
    htmlContent: `
      <p><strong>De :</strong> ${nom || "(anonyme)"} — ${email}</p>
      <p><strong>Message :</strong></p>
      <p>${message.replace(/\n/g, "<br>")}</p>
    `,
  });

  return { ok: true };
}
