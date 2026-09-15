"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Sans caractères ambigus à l'oral/à l'écrit (pas de 0/O, 1/I/L).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 9) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    redirect("/");
  }
  return supabase;
}

export async function createReaderCode(formData: FormData) {
  const supabase = await requireAdmin();

  const label = (formData.get("label") as string)?.trim() || null;
  const maxUsesRaw = (formData.get("max_uses") as string)?.trim();
  const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("reader_invite_codes").insert({
    code: randomCode(),
    label,
    max_uses: maxUses && maxUses > 0 ? maxUses : null,
    created_by: user?.id ?? null,
  });

  revalidatePath("/admin");
}

export async function toggleReaderCode(formData: FormData) {
  const supabase = await requireAdmin();

  const code = formData.get("code") as string;
  const nextState = formData.get("next_state") === "true";

  await supabase.from("reader_invite_codes").update({ is_active: nextState }).eq("code", code);

  revalidatePath("/admin");
}
