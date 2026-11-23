import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * La vignette floutée du match d'un projet (Sarah, 23/11/2026) : sans
 * adhésion, l'auteur voit son match flouté. Même verrou que les photos des
 * talents (/api/talents/photo, 02/10) : le flou est dans l'image elle-même,
 * fabriquée par le serveur. La page ne reçoit ni l'adresse de la vraie
 * vignette ni l'identifiant du projet proche — on demande l'image avec
 * SON projet, et le serveur retrouve le match.
 *
 * Le flou est plus fort que pour les portraits : une vignette porte souvent
 * le titre du film, qui ne doit pas se lire.
 */
const DOSSIER = path.join(homedir(), "cache", "matchs-flous");
const LARGEUR = 320;
const HAUTEUR = 200;
const FLOU = 16;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 401 });

  const id = new URL(request.url).searchParams.get("projet") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });

  const admin = createAdminClient();
  if (!admin) return new Response(null, { status: 404 });

  // Seul l'auteur du projet demande l'image de son match.
  const { data: projet } = await admin.from("projects").select("owner_id").eq("id", id).maybeSingle<{ owner_id: string }>();
  if (projet?.owner_id !== user.id) return new Response(null, { status: 404 });

  const chemin = await cheminVignetteDuMatch(admin, id);
  if (!chemin) return new Response(null, { status: 404 });

  const empreinte = createHash("sha256").update(chemin).digest("hex").slice(0, 24);
  const fichier = path.join(DOSSIER, `${empreinte}.jpg`);

  let image: Buffer;
  try {
    image = await readFile(fichier);
  } catch {
    try {
      const { data: origine } = await admin.storage.from("project-media").download(chemin);
      if (!origine) return new Response(null, { status: 404 });
      image = await sharp(Buffer.from(await origine.arrayBuffer()))
        .rotate()
        .resize(LARGEUR, HAUTEUR, { fit: "cover" })
        .blur(FLOU)
        .jpeg({ quality: 60 })
        .toBuffer();
      await mkdir(DOSSIER, { recursive: true });
      await writeFile(fichier, image);
    } catch (e) {
      console.error("Vignette floutée d'un match", id, e);
      return new Response(null, { status: 404 });
    }
  }

  return new Response(new Uint8Array(image), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" },
  });
}

/** Le chemin de la vignette du projet proche (la dernière déposée), lu avec la clé du serveur. */
async function cheminVignetteDuMatch(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  projectId: string,
): Promise<string | null> {
  const { data: match } = await admin
    .from("projets_matchs")
    .select("match_id")
    .eq("project_id", projectId)
    .maybeSingle<{ match_id: string }>();
  if (!match) return null;
  const { data: fichiers } = await admin
    .from("project_files")
    .select("storage_path")
    .eq("project_id", match.match_id)
    .eq("kind", "vignette")
    .order("uploaded_at", { ascending: false })
    .limit(1);
  return fichiers?.[0]?.storage_path ?? null;
}
