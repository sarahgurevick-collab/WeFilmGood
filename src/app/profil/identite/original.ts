import { photoDuChemin } from "@/lib/photo";
import type { createClient } from "@/lib/supabase/server";

/**
 * L'adresse de la photo entière gardée pour le cadrage (02/11/2026).
 * Depuis le 11/11, une adresse signée par le serveur : le dossier des
 * photos n'est plus public.
 */
export function urlOriginal(
  _supabase: Awaited<ReturnType<typeof createClient>>,
  chemin: string | null | undefined,
): string | null {
  return photoDuChemin(chemin);
}
