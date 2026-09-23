"use server";

import { createClient } from "@/lib/supabase/server";

export type Question = {
  id: string;
  texte: string;
  statut: "nouvelle" | "relayee" | "ecartee";
  created_at: string;
  auteur?: string;
};

async function atelierDeLaSalle(salle: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("ateliers").select("id").eq("salle", salle).maybeSingle();
  return { supabase, atelierId: data?.id ?? null };
}

/** Les questions de la personne connectée, pour qu'elle suive leur sort. */
export async function mesQuestions(salle: string): Promise<Question[]> {
  const { supabase, atelierId } = await atelierDeLaSalle(salle);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!atelierId || !user) return [];
  const { data } = await supabase
    .from("atelier_questions")
    .select("id, texte, statut, created_at")
    .eq("atelier_id", atelierId)
    .eq("auteur_id", user.id)
    .order("created_at");
  return (data ?? []) as Question[];
}

export async function poserQuestion(
  salle: string,
  texte: string,
): Promise<{ ok: boolean; questions: Question[] }> {
  const propre = texte.trim().slice(0, 1000);
  const { supabase, atelierId } = await atelierDeLaSalle(salle);
  if (!atelierId || !propre) return { ok: false, questions: await mesQuestions(salle) };
  const { error } = await supabase
    .from("atelier_questions")
    .insert({ atelier_id: atelierId, texte: propre });
  return { ok: !error, questions: await mesQuestions(salle) };
}

/** Toutes les questions, pour la régie (l'admin seulement : la base filtre). */
export async function questionsRegie(salle: string): Promise<Question[]> {
  const { supabase, atelierId } = await atelierDeLaSalle(salle);
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!atelierId || !isAdmin) return [];
  const { data } = await supabase
    .from("atelier_questions")
    .select("id, texte, statut, created_at, auteur:profiles(first_name, last_name, full_name)")
    .eq("atelier_id", atelierId)
    .order("created_at")
    .returns<
      (Question & {
        auteur: { first_name: string | null; last_name: string | null; full_name: string | null } | null;
      })[]
    >();
  return (data ?? []).map((q) => ({
    ...q,
    auteur:
      [q.auteur?.first_name, q.auteur?.last_name].filter(Boolean).join(" ") ||
      q.auteur?.full_name ||
      "Membre",
  }));
}

export async function changerStatut(
  salle: string,
  id: string,
  statut: Question["statut"],
): Promise<Question[]> {
  const supabase = await createClient();
  await supabase.from("atelier_questions").update({ statut }).eq("id", id);
  return questionsRegie(salle);
}
