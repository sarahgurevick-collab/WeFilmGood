import "server-only";

import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { echapper, envoyerEmail } from "@/lib/brevo";
import { createAdminClient, emailDuMembre } from "@/lib/supabase/admin";

const run = promisify(execFile);

/**
 * Le dépôt des videopitchs par les auteurs (22/10/2026, migration 0192).
 *
 * L'auteur envoie sa vidéo telle quelle ; le serveur l'allège en 720p
 * avec ffmpeg (sous 100 Mo), puis elle attend dans l'admin que Sarah la
 * dépose sur Vimeo et colle le lien, ou la refuse. Les fichiers vivent
 * sur le disque, dans un dossier par dépôt ; l'original disparaît dès que
 * la version allégée est prête, la version allégée dès que le videopitch
 * est validé ou refusé.
 */

export const DOSSIER = process.env.VIDEOPITCH_DIR ?? "/home/wfg/videopitchs";
/** 2 Go : un fichier brut sorti d'un téléphone ou d'un logiciel de montage. */
export const TAILLE_MAX = 2 * 1024 * 1024 * 1024;
/** Les morceaux envoyés par le navigateur (nginx en accepte au moins 12 Mo). */
export const TAILLE_MORCEAU = 8 * 1024 * 1024;
export const EXTENSIONS = ["mp4", "mov", "m4v", "avi", "mkv", "webm", "mpg", "mpeg", "wmv", "3gp", "mts", "m2ts"];

export type Etat = "envoi" | "recu" | "preparation" | "a_valider" | "valide" | "refuse" | "echec";
export type Langue = "fr" | "en";

export type Depot = {
  id: string;
  project_id: string;
  deposant_id: string;
  langue: Langue;
  etat: Etat;
  nom_origine: string | null;
  type_origine: string | null;
  taille_annoncee: number;
  taille_recue: number;
  taille_allegee: number | null;
  duree_secondes: number | null;
  erreur: string | null;
  motif_refus: string | null;
  vimeo_id: string | null;
  cree_le: string;
  recu_le: string | null;
  prepare_le: string | null;
  traite_le: string | null;
};

export const COLONNES =
  "id, project_id, deposant_id, langue, etat, nom_origine, type_origine, taille_annoncee, taille_recue, taille_allegee, duree_secondes, erreur, motif_refus, vimeo_id, cree_le, recu_le, prepare_le, traite_le";

export function extension(nom: string | null | undefined): string | null {
  const ext = (nom ?? "").split(".").pop()?.toLowerCase() ?? "";
  return EXTENSIONS.includes(ext) ? ext : null;
}

export const dossierDepot = (id: string) => path.join(DOSSIER, id);
export const cheminOrigine = (id: string, ext: string) => path.join(dossierDepot(id), `origine.${ext}`);
export const cheminAllege = (id: string) => path.join(dossierDepot(id), "allege.mp4");

/** Efface le dossier d'un dépôt (original et version allégée). Jamais bloquant. */
export async function supprimerFichiers(id: string) {
  try {
    await fs.rm(dossierDepot(id), { recursive: true, force: true });
  } catch (e) {
    console.error("Videopitch : dossier non effacé", id, e);
  }
}

/** Le numéro Vimeo dans ce que Sarah colle : une adresse vimeo.com/123456 (ou /video/123456), ou le numéro seul. */
export function numeroVimeo(texte: string): string | null {
  const t = texte.trim();
  const m = t.match(/vimeo\.com\/(?:video\/|manage\/videos\/)?(\d{6,})/i) ?? t.match(/^(\d{6,})(?:\/|$)/);
  return m ? m[1] : null;
}

export const tailleLisible = (octets: number | null | undefined) => {
  if (!octets) return "—";
  if (octets >= 1024 * 1024 * 1024) return `${(octets / (1024 * 1024 * 1024)).toFixed(1)} Go`;
  if (octets >= 1024 * 1024) return `${Math.round(octets / (1024 * 1024))} Mo`;
  return `${Math.round(octets / 1024)} Ko`;
};

export const dureeLisible = (s: number | null | undefined) =>
  s == null ? "—" : `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, "0")} s`;

// ---------------------------------------------------------------------
// La conversion
// ---------------------------------------------------------------------

async function dureeDe(chemin: string): Promise<number | null> {
  try {
    const { stdout } = await run("ffprobe", [
      "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", chemin,
    ]);
    const d = parseFloat(stdout.trim());
    return Number.isFinite(d) ? Math.round(d) : null;
  } catch {
    return null;
  }
}

/**
 * Allège une vidéo en 720p H.264 + AAC, lisible partout (téléphone,
 * navigateur, Vimeo). Deux minutes pèsent 25 à 40 Mo. Le serveur garde des
 * forces pour le site : deux fils, priorité basse.
 */
async function alleger(source: string, cible: string) {
  // Le plus grand côté ramené à 1280 (paysage comme portrait), dimensions paires.
  const echelle =
    "scale=w='if(gt(iw,ih),min(1280,iw),-2)':h='if(gt(iw,ih),-2,min(1280,ih))':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2";
  await run(
    "nice",
    [
      "-n", "10", "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-nostdin",
      "-i", source,
      "-vf", echelle,
      "-c:v", "libx264", "-preset", "medium", "-crf", "26", "-maxrate", "2200k", "-bufsize", "4400k",
      "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0",
      "-c:a", "aac", "-b:a", "128k", "-ac", "2",
      "-movflags", "+faststart", "-threads", "2",
      cible,
    ],
    { maxBuffer: 1024 * 1024, timeout: 60 * 60_000 },
  );
}

/**
 * Convertit un dépôt reçu. Un seul ouvrier à la fois par dépôt : c'est le
 * passage « recu → preparation » qui réserve le travail.
 */
export async function convertir(id: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const { data: reserve } = await admin
    .from("videopitch_depots")
    .update({ etat: "preparation", prepare_le: new Date().toISOString() })
    .eq("id", id)
    .eq("etat", "recu")
    .select(COLONNES)
    .maybeSingle<Depot>();
  if (!reserve) return;

  const ext = extension(reserve.nom_origine) ?? "mp4";
  const source = cheminOrigine(id, ext);
  const cible = cheminAllege(id);

  try {
    await fs.access(source);
    await alleger(source, cible);
    const [{ size }, duree] = await Promise.all([fs.stat(cible), dureeDe(cible)]);
    if (size === 0) throw new Error("vidéo vide après conversion");
    await admin
      .from("videopitch_depots")
      .update({ etat: "a_valider", taille_allegee: size, duree_secondes: duree, erreur: null })
      .eq("id", id);
    await fs.rm(source, { force: true });
    await prevenirRecu({ ...reserve, taille_allegee: size, duree_secondes: duree });
  } catch (e) {
    const message = e instanceof Error ? e.message.slice(0, 500) : String(e).slice(0, 500);
    console.error("Videopitch : conversion ratée", id, message);
    await admin.from("videopitch_depots").update({ etat: "echec", erreur: message }).eq("id", id);
    await supprimerFichiers(id);
    await prevenirEchec(reserve);
  }
}

/** Lance la conversion sans attendre : la réponse part tout de suite à l'auteur. */
export function lancerConversion(id: string) {
  convertir(id).catch((e) => console.error("Videopitch : conversion interrompue", id, e));
}

/**
 * Le rattrapage (crontab, toutes les 10 minutes) : les dépôts reçus que
 * personne ne convertit (redémarrage du site en pleine conversion), et le
 * ménage des envois abandonnés depuis plus de deux jours.
 */
export async function rattrapage(): Promise<{ convertis: number; nettoyes: number }> {
  const admin = createAdminClient();
  if (!admin) return { convertis: 0, nettoyes: 0 };

  const ilYAUneHeure = new Date(Date.now() - 60 * 60_000).toISOString();
  // Une « preparation » vieille d'une heure est morte avec le processus : on la remet en file.
  await admin
    .from("videopitch_depots")
    .update({ etat: "recu" })
    .eq("etat", "preparation")
    .lt("prepare_le", ilYAUneHeure);

  const { data: aConvertir } = await admin
    .from("videopitch_depots")
    .select("id")
    .eq("etat", "recu")
    .order("recu_le", { ascending: true })
    .limit(5);
  let convertis = 0;
  for (const d of aConvertir ?? []) {
    await convertir(d.id);
    convertis++;
  }

  const ilYADeuxJours = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString();
  const { data: abandonnes } = await admin
    .from("videopitch_depots")
    .select("id")
    .eq("etat", "envoi")
    .lt("cree_le", ilYADeuxJours);
  for (const d of abandonnes ?? []) {
    await supprimerFichiers(d.id);
    await admin.from("videopitch_depots").delete().eq("id", d.id);
  }
  return { convertis, nettoyes: (abandonnes ?? []).length };
}

// ---------------------------------------------------------------------
// Les e-mails à l'auteur
// ---------------------------------------------------------------------

async function destinataire(depot: Pick<Depot, "deposant_id" | "project_id">) {
  const admin = createAdminClient();
  if (!admin) return null;
  const [email, { data: profil }, { data: projet }] = await Promise.all([
    emailDuMembre(depot.deposant_id),
    admin.from("profiles").select("first_name, full_name").eq("id", depot.deposant_id).maybeSingle(),
    admin.from("projects").select("title").eq("id", depot.project_id).maybeSingle(),
  ]);
  if (!email) return null;
  const prenom = profil?.first_name?.trim() || profil?.full_name?.trim()?.split(" ")[0] || null;
  return { email, prenom, titre: projet?.title ?? "votre projet" };
}

function gabarit(prenom: string | null, paragraphes: string[], lien?: { href: string; texte: string }) {
  return `
    <div style="font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; max-width: 520px;">
      <p>${prenom ? `Bonjour ${echapper(prenom)},` : "Bonjour,"}</p>
      ${paragraphes.map((p) => `<p>${p}</p>`).join("\n")}
      ${lien ? `<p style="margin: 28px 0;"><a href="${lien.href}" style="background: #DA2C25; color: #fff; padding: 12px 22px; border-radius: 6px; text-decoration: none; font-weight: 600;">${lien.texte}</a></p>` : ""}
      <p style="font-size: 13px; color: #666;">— L'équipe WeFilmGood</p>
    </div>
  `;
}

const SITE = "https://app.wefilmgood.com";

async function prevenirRecu(depot: Depot) {
  const d = await destinataire(depot);
  if (!d) return;
  await envoyerEmail({
    to: [{ email: d.email, name: d.prenom ?? undefined }],
    subject: `Votre videopitch pour « ${d.titre} » est bien arrivé`,
    htmlContent: gabarit(d.prenom, [
      `Nous avons bien reçu le videopitch de « ${echapper(d.titre)} »${depot.langue === "en" ? " (version anglaise)" : ""}. Il a été préparé pour la lecture en ligne.`,
      "L'équipe le regarde avant de le mettre en ligne sur votre fiche projet. Vous recevrez un e-mail dès que ce sera fait.",
    ]),
  });
}

async function prevenirEchec(depot: Depot) {
  const d = await destinataire(depot);
  if (!d) return;
  await envoyerEmail({
    to: [{ email: d.email, name: d.prenom ?? undefined }],
    subject: `Votre videopitch pour « ${d.titre} » n'a pas pu être lu`,
    htmlContent: gabarit(
      d.prenom,
      [
        `Nous n'avons pas réussi à lire la vidéo envoyée pour « ${echapper(d.titre)} »${depot.nom_origine ? ` (${echapper(depot.nom_origine)})` : ""}. Le fichier est peut-être abîmé, ou dans un format que nous ne connaissons pas.`,
        "Vous pouvez la renvoyer depuis votre fiche projet, bloc Documents, de préférence en MP4.",
      ],
      { href: `${SITE}/projet/${depot.project_id}/documents`, texte: "Renvoyer ma vidéo" },
    ),
  });
}

export async function prevenirValide(depot: Depot) {
  const d = await destinataire(depot);
  if (!d) return;
  await envoyerEmail({
    to: [{ email: d.email, name: d.prenom ?? undefined }],
    subject: `Votre videopitch pour « ${d.titre} » est en ligne`,
    htmlContent: gabarit(
      d.prenom,
      [`Le videopitch de « ${echapper(d.titre)} »${depot.langue === "en" ? " (version anglaise)" : ""} est en ligne sur votre fiche projet.`],
      { href: `${SITE}/projet/${depot.project_id}`, texte: "Voir ma fiche projet" },
    ),
  });
}

export async function prevenirRefuse(depot: Depot, motif: string) {
  const d = await destinataire(depot);
  if (!d) return;
  await envoyerEmail({
    to: [{ email: d.email, name: d.prenom ?? undefined }],
    subject: `Votre videopitch pour « ${d.titre} » n'a pas été retenu`,
    htmlContent: gabarit(
      d.prenom,
      [
        `Nous avons regardé le videopitch envoyé pour « ${echapper(d.titre)} », et nous ne le mettons pas en ligne tel quel.`,
        `<em>${echapper(motif)}</em>`,
        "Vous pouvez en envoyer un autre depuis votre fiche projet, bloc Documents.",
      ],
      { href: `${SITE}/projet/${depot.project_id}/documents`, texte: "Envoyer un autre videopitch" },
    ),
  });
}

/**
 * L'adresse du lecteur d'une bande-annonce (YouTube, Vimeo ou Dailymotion), à partir du
 * lien collé : youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/…,
 * vimeo.com/123456789. Rien si le lien n'est pas reconnu.
 */
export function lecteurBandeAnnonce(lien: string | null | undefined): string | null {
  const t = (lien ?? "").trim();
  if (!t) return null;
  const yt = t.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0`;
  const dm = t.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([a-z0-9]+)/i);
  if (dm) return `https://www.dailymotion.com/embed/video/${dm[1]}`;
  const vimeo = numeroVimeo(t);
  return vimeo ? `https://player.vimeo.com/video/${vimeo}` : null;
}
