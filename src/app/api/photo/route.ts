import { lirePhoto, signatureValable } from "@/lib/photo";

/**
 * Une photo nette d'un membre (11/11/2026) : servie seulement si
 * l'adresse porte une signature du serveur encore valable (voir
 * src/lib/photo.ts). Le dossier des photos n'est plus lisible autrement.
 */
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const chemin = p.get("c") ?? "";
  const echeance = Number(p.get("e"));
  const recue = p.get("s") ?? "";
  if (!chemin || !signatureValable(chemin, echeance, recue)) return new Response(null, { status: 403 });

  const photo = await lirePhoto(chemin);
  if (!photo) return new Response(null, { status: 404 });
  // Seulement des images : jamais un autre type de fichier servi depuis le site.
  if (!photo.type.startsWith("image/") || photo.type.includes("svg")) return new Response(null, { status: 404 });

  return new Response(new Uint8Array(photo.donnees), {
    headers: {
      "Content-Type": photo.type,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, noimageindex",
    },
  });
}
