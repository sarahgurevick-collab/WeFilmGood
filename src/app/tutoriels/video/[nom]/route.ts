import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { basename, join } from "node:path";
import { createClient } from "@/lib/supabase/server";
import { DOSSIER_TUTORIELS, TUTORIELS } from "../../tutoriels";

/**
 * Sert une vidéo de tutoriel (ou son image d'attente) depuis le dossier du
 * serveur. Le navigateur demande les vidéos par morceaux (en-tête Range)
 * pour pouvoir avancer dans la lecture : on répond en 206 avec le morceau.
 */
const TYPES: Record<string, string> = { mp4: "video/mp4", jpg: "image/jpeg" };

export async function GET(requete: Request, { params }: { params: Promise<{ nom: string }> }) {
  const nom = basename(decodeURIComponent((await params).nom));
  const point = nom.lastIndexOf(".");
  const base = point > 0 ? nom.slice(0, point) : nom;
  const extension = point > 0 ? nom.slice(point + 1).toLowerCase() : "";
  // « galaxies-en » : la version anglaise du film « galaxies ».
  const slug = base.endsWith("-en") ? base.slice(0, -3) : base;
  const tutoriel = TUTORIELS.find((t) => t.slug === slug);
  if (!tutoriel || !TYPES[extension]) return new Response("Introuvable.", { status: 404 });

  if (tutoriel.membres) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response("Réservé aux membres connectés.", { status: 403 });
  }

  let taille: number;
  const chemin = join(DOSSIER_TUTORIELS, `${base}.${extension}`);
  try {
    taille = (await stat(chemin)).size;
  } catch {
    return new Response("Introuvable.", { status: 404 });
  }

  const entetes: Record<string, string> = {
    "Content-Type": TYPES[extension],
    "Accept-Ranges": "bytes",
    // Avec la date du fichier dans l'adresse (?v=, posée par la page), le
    // navigateur peut garder le film longtemps : un film refait a une autre
    // adresse. Sans elle, il revérifie à chaque fois.
    "Cache-Control": new URL(requete.url).searchParams.has("v")
      ? "private, max-age=31536000, immutable"
      : "private, no-cache",
  };

  const range = requete.headers.get("range");
  const m = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (m && (m[1] || m[2])) {
    const debut = m[1] ? Number(m[1]) : Math.max(0, taille - Number(m[2]));
    const fin = m[1] && m[2] ? Math.min(Number(m[2]), taille - 1) : taille - 1;
    if (debut >= taille || debut > fin) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${taille}` } });
    }
    const flux = Readable.toWeb(createReadStream(chemin, { start: debut, end: fin })) as ReadableStream<Uint8Array>;
    return new Response(flux, {
      status: 206,
      headers: { ...entetes, "Content-Range": `bytes ${debut}-${fin}/${taille}`, "Content-Length": String(fin - debut + 1) },
    });
  }

  const flux = Readable.toWeb(createReadStream(chemin)) as ReadableStream<Uint8Array>;
  return new Response(flux, { headers: { ...entetes, "Content-Length": String(taille) } });
}
