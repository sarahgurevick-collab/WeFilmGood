import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import DOMPurify from "isomorphic-dompurify";
import { echapper } from "@/lib/brevo";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Les mailings de masse aux membres (16/11/2026, Sarah) : WFG 2 choisit les
 * destinataires (catégorie, métier, langue), Brevo envoie. WFG 1 envoyait
 * depuis son propre serveur et finissait en indésirables.
 */

const SITE = "https://app.wefilmgood.com";
const BREVO = "https://api.brevo.com/v3";
/** Combien de destinataires par appel à Brevo (son maximum est 1 000). */
const LOT = 200;

export const EXPEDITEURS = ["WeFilmGood", "Maison des Scénaristes"];
export const REPONDRE_A = ["hello@wefilmgood.com", "hello@maisondesscenaristes.org"];

export const CATEGORIES_MAILING: { cle: string; libelle: string }[] = [
  { cle: "auteur", libelle: "Auteurs" },
  { cle: "producteur", libelle: "Producteurs" },
  { cle: "talent", libelle: "Autres talents" },
  { cle: "cinephile", libelle: "StoryLighters" },
];

export type Mailing = {
  id: string;
  created_at: string;
  expediteur_nom: string;
  repondre_a: string;
  objet: string;
  corps: string;
  bouton_libelle: string | null;
  bouton_lien: string | null;
  categories: string[];
  metiers: string[];
  langues: string[];
  statut: "brouillon" | "envoi" | "envoye" | "interrompu";
  nb_destinataires: number | null;
  nb_envoyes: number;
  lance_le: string | null;
  termine_le: string | null;
  battement: string | null;
  erreur: string | null;
};

/* ---------- Désinscription : un lien signé, sans rien stocker ---------- */

function signature(profileId: string): string {
  const secret = process.env.MAILING_SECRET;
  if (!secret) throw new Error("MAILING_SECRET manquant");
  return createHmac("sha256", secret).update(profileId).digest("hex").slice(0, 32);
}

export function lienDesinscription(profileId: string): string {
  return `${SITE}/desinscription?p=${profileId}&j=${signature(profileId)}`;
}

export function jetonValide(profileId: string, jeton: string): boolean {
  try {
    const attendu = Buffer.from(signature(profileId));
    const recu = Buffer.from(jeton);
    return attendu.length === recu.length && timingSafeEqual(attendu, recu);
  } catch {
    return false;
  }
}

/* ---------- Le message ---------- */

/** Le texte écrit par l'administration : mise en forme simple, liens compris. */
export function nettoyerCorps(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "ul", "ol", "li", "blockquote", "span", "a"],
    ALLOWED_ATTR: ["style", "href"],
  });
}

/** Une adresse écrite en clair (https://…) devient un lien cliquable. */
function rendreLiensCliquables(html: string): string {
  return html.replace(/(^|[\s>(])(https?:\/\/[^\s<)]+)/g, (_, avant: string, url: string) => {
    return `${avant}<a href="${url}" style="color:#DA2C25;">${url}</a>`;
  });
}

function lienSur(url: string | null): string | null {
  const u = (url ?? "").trim();
  return /^https?:\/\//i.test(u) ? u : null;
}

/** L'email tel que le reçoit un destinataire. `{prénom}` est remplacé. */
export function composerEmail(
  m: Pick<Mailing, "corps" | "bouton_libelle" | "bouton_lien">,
  destinataire: { profileId: string; prenom: string | null },
): string {
  const prenom = echapper(destinataire.prenom ?? "");
  const corps = rendreLiensCliquables(nettoyerCorps(m.corps))
    .replace(/\{(prénom|prenom|first_name)\}/gi, prenom)
    // « Bonjour , » quand on ne connaît pas le prénom.
    .replace(/\s+([,!])/g, "$1");
  const lien = lienSur(m.bouton_lien);
  const bouton =
    lien && m.bouton_libelle?.trim()
      ? `<p style="margin: 28px 0;"><a href="${echapper(lien)}" style="background: #DA2C25; color: #fff; padding: 12px 22px; border-radius: 6px; text-decoration: none; font-weight: 600;">${echapper(m.bouton_libelle.trim())}</a></p>`
      : "";
  return `
    <div style="font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; max-width: 560px; font-size: 15px; line-height: 1.5;">
      ${corps}
      ${bouton}
      <p style="font-size: 12px; color: #666; margin-top: 36px; border-top: 1px solid #ddd; padding-top: 12px;">
        Vous recevez cet email parce que vous êtes inscrit sur WeFilmGood.
        <a href="${lienDesinscription(destinataire.profileId)}" style="color: #666;">Ne plus recevoir ces emails</a>
      </p>
    </div>
  `;
}

/* ---------- Brevo ---------- */

function enTetes() {
  return {
    "api-key": process.env.BREVO_API_KEY ?? "",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Combien d'emails le compte Brevo peut encore envoyer (null = inconnu). */
export async function creditsBrevo(): Promise<number | null> {
  try {
    const r = await fetch(`${BREVO}/account`, { headers: enTetes(), cache: "no-store" });
    if (!r.ok) return null;
    const compte = (await r.json()) as { plan?: { credits?: number; creditsType?: string }[] };
    return (compte.plan ?? [])
      .filter((p) => p.creditsType === "sendLimit")
      .reduce((somme, p) => somme + (p.credits ?? 0), 0);
  } catch {
    return null;
  }
}

type Envoi = { profileId: string; email: string; prenom: string | null };

/** Un appel à Brevo pour plusieurs destinataires, chacun avec son email. */
async function envoyerLot(m: Mailing, envois: Envoi[]): Promise<string | null> {
  const expediteur = process.env.BREVO_SENDER_EMAIL;
  if (!process.env.BREVO_API_KEY || !expediteur) return "Brevo n'est pas configuré.";
  try {
    const r = await fetch(`${BREVO}/smtp/email`, {
      method: "POST",
      headers: enTetes(),
      body: JSON.stringify({
        sender: { email: expediteur, name: m.expediteur_nom },
        replyTo: { email: m.repondre_a, name: m.expediteur_nom },
        subject: m.objet,
        htmlContent: "<p></p>",
        tags: [`mailing-${m.id}`],
        messageVersions: envois.map((e) => ({
          to: [{ email: e.email }],
          htmlContent: composerEmail(m, e),
        })),
      }),
    });
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 300);
      console.error("Mailing : Brevo a refusé l'envoi", r.status, detail);
      return `Brevo a refusé l'envoi (${r.status}) : ${detail}`;
    }
    return null;
  } catch (err) {
    return `Brevo ne répond pas : ${String(err).slice(0, 200)}`;
  }
}

/** L'essai : le mailing tel quel, à une seule adresse. */
export async function envoyerEssai(m: Mailing, envoi: Envoi): Promise<string | null> {
  return envoyerLot({ ...m, objet: `[Essai] ${m.objet}` }, [envoi]);
}

/**
 * L'envoi lui-même, par lots, après la réponse à l'écran. Chaque lot parti
 * est noté aussitôt : un envoi interrompu reprend là où il s'est arrêté,
 * et personne ne reçoit deux fois le même mailing.
 */
export async function poursuivreEnvoi(mailingId: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  for (;;) {
    const { data: m } = await admin.from("mailings").select("*").eq("id", mailingId).maybeSingle<Mailing>();
    if (!m || m.statut !== "envoi") return;

    const { data: lot } = await admin
      .from("mailing_envois")
      .select("profile_id, email, prenom")
      .eq("mailing_id", mailingId)
      .is("envoye_le", null)
      .limit(LOT);

    if (!lot || lot.length === 0) {
      await admin
        .from("mailings")
        .update({ statut: "envoye", termine_le: new Date().toISOString(), erreur: null })
        .eq("id", mailingId);
      return;
    }

    const erreur = await envoyerLot(
      m,
      lot.map((l) => ({ profileId: l.profile_id as string, email: l.email as string, prenom: l.prenom as string | null })),
    );
    if (erreur) {
      await admin.from("mailings").update({ statut: "interrompu", erreur }).eq("id", mailingId);
      return;
    }

    const maintenant = new Date().toISOString();
    await admin
      .from("mailing_envois")
      .update({ envoye_le: maintenant })
      .eq("mailing_id", mailingId)
      .in("profile_id", lot.map((l) => l.profile_id as string));
    await admin
      .from("mailings")
      .update({ nb_envoyes: m.nb_envoyes + lot.length, battement: maintenant })
      .eq("id", mailingId);

    await new Promise((ok) => setTimeout(ok, 1000));
  }
}

/** Un envoi « en cours » sans signe de vie depuis deux minutes s'est arrêté. */
export function envoiArrete(m: Pick<Mailing, "statut" | "battement">): boolean {
  if (m.statut === "interrompu") return true;
  if (m.statut !== "envoi") return false;
  return !m.battement || Date.now() - new Date(m.battement).getTime() > 2 * 60 * 1000;
}
