import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cheminEnregistrement } from "@/lib/ateliers";

/**
 * La rediffusion d'un atelier, lue depuis le disque du serveur.
 * Réservée aux membres connectés et aux intervenants (avec leur clé).
 * Gère les requêtes partielles (« Range ») : sans elles, le lecteur
 * vidéo ne pourrait pas avancer ou reculer dans l'enregistrement.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ salle: string }> },
) {
  const { salle } = await params;
  const cle = new URL(request.url).searchParams.get("cle");

  let fichier: string | null = null;
  if (cle && /^[a-f0-9]{36}$/.test(cle)) {
    const admin = createAdminClient();
    const { data } = admin
      ? await admin
          .from("atelier_intervenants")
          .select("atelier:ateliers!inner(rediffusion_fichier, salle)")
          .eq("cle", cle)
          .eq("atelier.salle", salle)
          .maybeSingle<{ atelier: { rediffusion_fichier: string | null } }>()
      : { data: null };
    fichier = data?.atelier.rediffusion_fichier ?? null;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response("Réservé aux membres", { status: 401 });
    const { data } = await supabase
      .from("ateliers")
      .select("rediffusion_fichier")
      .eq("salle", salle)
      .maybeSingle();
    fichier = data?.rediffusion_fichier ?? null;
  }

  const chemin = fichier ? cheminEnregistrement(fichier) : null;
  if (!chemin) return new Response("Pas de rediffusion", { status: 404 });

  let taille: number;
  try {
    taille = (await stat(chemin)).size;
  } catch {
    return new Response("Fichier introuvable", { status: 404 });
  }

  const entetes = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  };

  const plage = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (!plage) {
    const flux = Readable.toWeb(createReadStream(chemin)) as ReadableStream;
    return new Response(flux, { headers: { ...entetes, "Content-Length": String(taille) } });
  }

  let debut = plage[1] ? Number(plage[1]) : NaN;
  let fin = plage[2] ? Number(plage[2]) : taille - 1;
  if (Number.isNaN(debut)) {
    // « bytes=-500 » : les 500 derniers octets.
    debut = Math.max(0, taille - Number(plage[2]));
    fin = taille - 1;
  }
  fin = Math.min(fin, taille - 1);
  if (debut > fin || debut >= taille) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${taille}` } });
  }

  const flux = Readable.toWeb(createReadStream(chemin, { start: debut, end: fin })) as ReadableStream;
  return new Response(flux, {
    status: 206,
    headers: {
      ...entetes,
      "Content-Length": String(fin - debut + 1),
      "Content-Range": `bytes ${debut}-${fin}/${taille}`,
    },
  });
}
