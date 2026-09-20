import "server-only";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

type Destinataire = { email: string; name?: string };

type EnvoyerEmailParams = {
  to: Destinataire[];
  subject: string;
  htmlContent: string;
  replyTo?: Destinataire;
};

/**
 * Échoue silencieusement (log + retour false) plutôt que de faire planter
 * le flux appelant : un email raté ne doit jamais bloquer une inscription
 * ou un dépôt de projet déjà enregistrés en base.
 */
export async function envoyerEmail({
  to,
  subject,
  htmlContent,
  replyTo,
}: EnvoyerEmailParams): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey || !senderEmail) {
    console.error("Brevo: BREVO_API_KEY ou BREVO_SENDER_EMAIL manquant");
    return false;
  }

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: senderEmail,
          name: process.env.BREVO_SENDER_NAME || "WeFilmGood",
        },
        to,
        replyTo,
        subject,
        htmlContent,
      }),
    });

    if (!response.ok) {
      console.error("Brevo: échec de l'envoi", response.status, await response.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("Brevo: erreur réseau", err);
    return false;
  }
}
