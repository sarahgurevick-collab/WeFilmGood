import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import { Readable } from "node:stream";
import { cheminAllege } from "@/lib/videopitch";
import { depotDe } from "../../../acces";

/**
 * La vidéo allégée, pour la regarder dans l'admin (ou la télécharger
 * avant de la déposer sur Vimeo : ?telecharger=1). Les plages d'octets
 * (Range) sont servies : sans elles, impossible d'avancer dans la vidéo.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const acces = await depotDe(id);
  if (!acces) return new Response("Introuvable", { status: 404 });
  const { depot, admin } = acces;
  if (depot.etat !== "a_valider") return new Response("Vidéo indisponible", { status: 404 });

  const chemin = cheminAllege(id);
  let taille: number;
  try {
    taille = (await fs.stat(chemin)).size;
  } catch {
    return new Response("Fichier absent", { status: 404 });
  }

  const telecharger = new URL(req.url).searchParams.get("telecharger") === "1";
  const entetes: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  };
  if (telecharger) {
    const { data: projet } = await admin.from("projects").select("title").eq("id", depot.project_id).maybeSingle();
    const base = (projet?.title ?? "videopitch")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "videopitch";
    entetes["Content-Disposition"] = `attachment; filename="${base}-videopitch-${depot.langue}.mp4"`;
  }

  const plage = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  let debut = 0;
  let fin = taille - 1;
  let statut = 200;
  if (plage && (plage[1] || plage[2])) {
    debut = plage[1] ? parseInt(plage[1], 10) : Math.max(0, taille - parseInt(plage[2], 10));
    fin = plage[1] && plage[2] ? Math.min(parseInt(plage[2], 10), taille - 1) : taille - 1;
    if (debut > fin || debut >= taille) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${taille}` } });
    }
    statut = 206;
    entetes["Content-Range"] = `bytes ${debut}-${fin}/${taille}`;
  }
  entetes["Content-Length"] = String(fin - debut + 1);
  const flux = createReadStream(chemin, { start: debut, end: fin });
  return new Response(Readable.toWeb(flux) as ReadableStream, { status: statut, headers: entetes });
}
