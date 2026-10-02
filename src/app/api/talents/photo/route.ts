import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";

/**
 * La photo floutée d'un talent (02/10, décision de Sarah) : dans la
 * Galaxie de Talents, la photo n'est pas visible. Un flou posé par la
 * page ne suffisait pas — « Enregistrer l'image » donnait la photo
 * nette. Ici le flou est dans l'image elle-même : la page ne reçoit
 * jamais l'adresse de la photo d'origine.
 *
 * Chaque image floutée est gardée sur le disque du serveur, hors du
 * dépôt ; elle est refaite quand le talent change de photo (le nom du
 * fichier dépend de l'adresse de la photo).
 */
const DOSSIER = path.join(homedir(), "cache", "talents-flous");
const COTE = 300;
const FLOU = 7;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 401 });

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });

  const { data: profil } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", id)
    .maybeSingle<{ avatar_url: string | null }>();
  if (!profil?.avatar_url) return new Response(null, { status: 404 });

  const empreinte = createHash("sha256").update(profil.avatar_url).digest("hex").slice(0, 16);
  const fichier = path.join(DOSSIER, `${id}-${empreinte}.jpg`);

  let image: Buffer;
  try {
    image = await readFile(fichier);
  } catch {
    try {
      const origine = await fetch(profil.avatar_url);
      if (!origine.ok) return new Response(null, { status: 404 });
      image = await sharp(Buffer.from(await origine.arrayBuffer()))
        .rotate()
        .resize(COTE, COTE, { fit: "cover" })
        .blur(FLOU)
        .jpeg({ quality: 70 })
        .toBuffer();
      await mkdir(DOSSIER, { recursive: true });
      await writeFile(fichier, image);
    } catch (e) {
      console.error("Photo floutée d'un talent", id, e);
      return new Response(null, { status: 404 });
    }
  }

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
