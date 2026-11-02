import type { createClient } from "@/lib/supabase/server";

/** L'adresse publique de la photo entière gardée pour le cadrage (02/11/2026). */
export function urlOriginal(
  supabase: Awaited<ReturnType<typeof createClient>>,
  chemin: string | null | undefined,
): string | null {
  if (!chemin) return null;
  return supabase.storage.from("avatars").getPublicUrl(chemin).data.publicUrl;
}
