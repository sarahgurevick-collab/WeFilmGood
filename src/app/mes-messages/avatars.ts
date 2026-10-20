import type { SupabaseClient } from "@supabase/supabase-js";
import { lettreDuMetier } from "@/lib/lettre-metier";

export type AvatarDe = { src: string | null; lettre: string };

/** La photo de chaque correspondant, ou la lettre de son premier métier. */
export async function avatarsDe(supabase: SupabaseClient, ids: string[]): Promise<Map<string, AvatarDe>> {
  const parId = new Map<string, AvatarDe>();
  if (ids.length === 0) return parId;
  const [{ data: profils }, { data: metiers }] = await Promise.all([
    supabase.from("profiles").select("id, avatar_url").in("id", ids),
    supabase.from("profile_roles").select("profile_id, role:roles(label_fr, position)").in("profile_id", ids),
  ]);
  const premier = new Map<string, { label: string; position: number }>();
  for (const m of (metiers ?? []) as unknown as { profile_id: string; role: { label_fr: string; position: number } | null }[]) {
    if (!m.role || m.role.position >= 90) continue;
    const deja = premier.get(m.profile_id);
    if (!deja || m.role.position < deja.position) premier.set(m.profile_id, { label: m.role.label_fr, position: m.role.position });
  }
  for (const p of (profils ?? []) as { id: string; avatar_url: string | null }[]) {
    parId.set(p.id, { src: p.avatar_url, lettre: lettreDuMetier(premier.get(p.id)?.label) || "?" });
  }
  return parId;
}
