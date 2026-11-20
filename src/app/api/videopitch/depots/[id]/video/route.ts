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
    // Le titre du projet tel qu'il s'écrit sur WFG, accents, espaces et
    // apostrophes compris (20/11, Sarah) : on le retrouve ainsi sur Vimeo, et
    // le lien peut être recopié sur la bonne fiche. Seuls les signes qu'un
    // nom de fichier ne supporte pas sont retirés. Une version anglaise
    // porte « EN » derrière, pour ne pas écraser la française.
    const titre = (projet?.title ?? "StoryPitch").replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim() || "StoryPitch";
    const nom = `${titre}${depot.genre !== "comedypitch" && depot.langue === "en" ? " EN" : ""}.mp4`;
    const secours = nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
    entetes["Content-Disposition"] = `attachment; filename="${secours}"; filename*=UTF-8''${encodeURIComponent(nom).replace(/'/g, "%27")}`;
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
