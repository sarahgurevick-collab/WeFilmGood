import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { createClient } from "@/lib/supabase/server";

/**
 * Télécharger un fichier préparé pour l'administration (listes Excel,
 * documents Word) : ils sont posés sur le serveur dans ~/exports, et
 * servis ici aux seules administratrices. Le panneau de l'application
 * de bureau ne sait pas les enregistrer (27/09/2026).
 */
const DOSSIER = "/home/wfg/exports";

const TYPES: Record<string, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  csv: "text/csv; charset=utf-8",
};

export async function GET(_: Request, { params }: { params: Promise<{ nom: string }> }) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return new Response("Accès réservé à l'administration.", { status: 403 });

  // basename : pas de « ../ » pour sortir du dossier.
  const nom = basename(decodeURIComponent((await params).nom));
  const extension = nom.split(".").pop()?.toLowerCase() ?? "";
  if (!TYPES[extension]) return new Response("Fichier introuvable.", { status: 404 });

  try {
    const contenu = await readFile(join(DOSSIER, nom));
    return new Response(new Uint8Array(contenu), {
      headers: {
        "Content-Type": TYPES[extension],
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(nom)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Fichier introuvable.", { status: 404 });
  }
}
