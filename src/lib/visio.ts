import { createHmac } from "node:crypto";

/** Adresse du serveur de visio (Jitsi, sur le même VPS que le site). */
export const VISIO_URL = "https://meet.wefilmgood.com";

/**
 * Fabrique le laissez-passer (jeton JWT) qui ouvre une salle Jitsi.
 * Le serveur de visio refuse toute personne qui n'en a pas : c'est ce
 * qui réserve les ateliers aux membres connectés à WeFilmGood.
 */
export function jetonVisio(opts: {
  salle: string;
  nom: string;
  email?: string;
  moderateur: boolean;
  dureeSecondes?: number;
}): string {
  const secret = process.env.JITSI_JWT_SECRET;
  if (!secret) throw new Error("JITSI_JWT_SECRET manquant");

  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const maintenant = Math.floor(Date.now() / 1000);
  const entete = b64({ alg: "HS256", typ: "JWT" });
  const contenu = b64({
    aud: "jitsi",
    iss: process.env.JITSI_JWT_APP_ID ?? "wefilmgood",
    sub: "*",
    room: opts.salle,
    nbf: maintenant - 60,
    exp: maintenant + (opts.dureeSecondes ?? 6 * 3600),
    context: {
      user: { name: opts.nom, email: opts.email, moderator: opts.moderateur },
    },
  });
  const signature = createHmac("sha256", secret)
    .update(`${entete}.${contenu}`)
    .digest("base64url");
  return `${entete}.${contenu}.${signature}`;
}
