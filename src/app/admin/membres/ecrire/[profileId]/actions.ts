"use server";

import { redirect } from "next/navigation";
import { echapper, envoyerEmail } from "@/lib/brevo";
import { createAdminClient, emailDuMembre } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Un email personnel à un seul membre (17/11, Sarah), depuis l'écran des
 * membres. Il part par Brevo, et la réponse arrive dans la boîte de la
 * Maison (ADMIN_REPLY_TO, dans .env.local : le dépôt est public, l'adresse
 * n'y figure pas). Ce n'est pas un mailing : un membre désinscrit des
 * mailings reçoit quand même un message écrit à la main pour lui.
 */
export async function ecrireAuMembre(formData: FormData) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const profileId = formData.get("profile_id") as string;
  const objet = ((formData.get("objet") as string) ?? "").trim();
  const message = ((formData.get("message") as string) ?? "").trim();
  const base = `/admin/membres/ecrire/${profileId}`;

  if (!objet || !message) redirect(`${base}?erreur=${encodeURIComponent("L'objet et le message sont obligatoires.")}`);

  const replyTo = process.env.ADMIN_REPLY_TO;
  if (!replyTo) redirect(`${base}?erreur=${encodeURIComponent("L'adresse de réponse n'est pas réglée sur le serveur.")}`);

  const email = await emailDuMembre(profileId);
  if (!email) redirect(`${base}?erreur=${encodeURIComponent("Ce membre n'a pas d'adresse email.")}`);

  const admin = createAdminClient();
  const { data: profil } = admin
    ? await admin.from("profiles").select("full_name").eq("id", profileId).maybeSingle<{ full_name: string | null }>()
    : { data: null };

  const html = `
    <div style="font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; max-width: 560px; line-height: 1.5;">
      ${echapper(message)
        .split(/\n{2,}/)
        .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
        .join("")}
    </div>`;

  const ok = await envoyerEmail({
    to: [{ email, name: profil?.full_name ?? undefined }],
    subject: objet,
    htmlContent: html,
    replyTo: { email: replyTo, name: "WeFilmGood" },
  });

  if (!ok) redirect(`${base}?erreur=${encodeURIComponent("L'email n'a pas pu partir. Réessayez dans un instant.")}`);
  redirect(`${base}?envoye=1`);
}
