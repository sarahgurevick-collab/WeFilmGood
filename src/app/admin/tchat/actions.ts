"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function exigerAdmin() {
  const supabase = await createClient();
  const [{ data: isAdmin }, { data: auth }] = await Promise.all([
    supabase.rpc("is_admin"),
    supabase.auth.getUser(),
  ]);
  if (isAdmin !== true || !auth.user) redirect("/");
  return { supabase, userId: auth.user.id };
}

/** Enregistre le nouveau texte ; l'ancien devient la version précédente. */
export async function enregistrerConnaissances(formData: FormData) {
  const { supabase, userId } = await exigerAdmin();
  const texte = ((formData.get("texte") as string) ?? "").trim();
  if (!texte) {
    redirect("/admin/tchat?erreur=" + encodeURIComponent("Le texte ne peut pas être vide."));
  }

  const { data: actuel } = await supabase
    .from("assistant_connaissances")
    .select("texte")
    .eq("id", 1)
    .maybeSingle();

  if (actuel?.texte === texte) redirect("/admin/tchat?enregistre=1");

  const { error } = await supabase.from("assistant_connaissances").upsert({
    id: 1,
    texte,
    texte_precedent: actuel?.texte ?? null,
    modifie_le: new Date().toISOString(),
    modifie_par: userId,
  });
  if (error) {
    redirect("/admin/tchat?erreur=" + encodeURIComponent("L'enregistrement a échoué. Réessayez."));
  }
  redirect("/admin/tchat?enregistre=1");
}

/** Revient à la version d'avant le dernier enregistrement (les deux s'échangent). */
export async function revenirVersionPrecedente() {
  const { supabase, userId } = await exigerAdmin();
  const { data: actuel } = await supabase
    .from("assistant_connaissances")
    .select("texte, texte_precedent")
    .eq("id", 1)
    .maybeSingle();
  if (!actuel?.texte_precedent) redirect("/admin/tchat");

  await supabase
    .from("assistant_connaissances")
    .update({
      texte: actuel.texte_precedent,
      texte_precedent: actuel.texte,
      modifie_le: new Date().toISOString(),
      modifie_par: userId,
    })
    .eq("id", 1);
  redirect("/admin/tchat?retour=1");
}
