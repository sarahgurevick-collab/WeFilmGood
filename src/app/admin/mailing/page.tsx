import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import NavAdmin from "../NavAdmin";
import formStyles from "@/components/form.module.css";
import adminStyles from "../admin.module.css";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { creditsBrevo, type Mailing } from "@/lib/mailing";
import { creerMailing } from "./actions";

const ETATS: Record<Mailing["statut"], string> = {
  brouillon: "Brouillon",
  envoi: "Envoi en cours",
  envoye: "Envoyé",
  interrompu: "Interrompu",
};

const jour = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });

/**
 * Les mailings de masse aux membres (16/11/2026, Sarah) : comme sur WFG 1,
 * par catégorie, métier et langue — mais c'est Brevo qui envoie.
 */
export default async function MailingAdminPage() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");
  const admin = createAdminClient();

  const [{ data: mailings }, credits, { count: desinscrits }] = await Promise.all([
    admin
      ? admin.from("mailings").select("*").order("created_at", { ascending: false }).returns<Mailing[]>()
      : Promise.resolve({ data: [] as Mailing[] }),
    creditsBrevo(),
    admin
      ? admin.from("mailing_desinscriptions").select("profile_id", { count: "exact", head: true })
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Mailing" theme="clair">
      <p className={formStyles.hint}>
        Écrire aux membres, par catégorie, métier et langue. Les emails partent par Brevo. Chaque email
        porte un lien pour ne plus recevoir ces envois ; les personnes désinscrites ({desinscrits ?? 0}) et
        les lecteurs ne reçoivent rien.
      </p>
      <p className={formStyles.hint}>
        {credits === null
          ? "Le nombre d'emails disponibles chez Brevo n'a pas pu être lu."
          : `Emails disponibles chez Brevo : ${credits.toLocaleString("fr-FR")}.`}
      </p>

      <form action={creerMailing} style={{ margin: "24px 0" }}>
        <button type="submit" className={formStyles.submit}>
          Nouveau mailing
        </button>
      </form>

      {mailings && mailings.length > 0 && (
        <table className={adminStyles.table}>
          <thead>
            <tr>
              <th>Objet</th>
              <th>État</th>
              <th>Destinataires</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {mailings.map((m) => (
              <tr key={m.id}>
                <td>
                  <Link href={`/admin/mailing/${m.id}`}>{m.objet || "Sans objet"}</Link>
                </td>
                <td>{ETATS[m.statut]}</td>
                <td>
                  {m.statut === "brouillon"
                    ? "—"
                    : `${m.nb_envoyes.toLocaleString("fr-FR")} / ${(m.nb_destinataires ?? 0).toLocaleString("fr-FR")}`}
                </td>
                <td>{jour.format(new Date(m.lance_le ?? m.created_at))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}
