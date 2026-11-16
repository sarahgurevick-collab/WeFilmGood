import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import RichTextEditor from "@/components/RichTextEditor";
import NavAdmin from "../../NavAdmin";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nomDeLangue } from "@/lib/langues";
import {
  CATEGORIES_MAILING,
  EXPEDITEURS,
  REPONDRE_A,
  composerEmail,
  creditsBrevo,
  envoiArrete,
  type Mailing,
} from "@/lib/mailing";
import { enregistrerMailing, reprendreEnvoi, supprimerBrouillon } from "../actions";

const MESSAGES: Record<string, string> = {
  enregistre: "Le brouillon est enregistré.",
  essai: "L'essai est parti : regardez votre boîte de réception.",
};
const ERREURS: Record<string, string> = {
  enregistrement: "L'enregistrement n'a pas abouti. Réessayez.",
  vide: "Il faut un objet et un message.",
  essai: "L'essai n'a pas pu partir : Brevo a refusé l'envoi.",
  confirmation: "Cochez la case de confirmation avant d'envoyer.",
  personne: "Personne ne correspond à ce choix de destinataires.",
  credits: "Il n'y a pas assez d'emails disponibles chez Brevo pour ce nombre de destinataires.",
};

const cases: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: "6px 18px", margin: "6px 0 0" };
const famille: React.CSSProperties = { margin: "0 0 18px", padding: 0, border: 0 };

function Cases({ nom, choix, coches }: { nom: string; choix: { cle: string; libelle: string }[]; coches: string[] }) {
  return (
    <div style={cases}>
      {choix.map((c) => (
        <label key={c.cle} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14 }}>
          <input type="checkbox" name={nom} value={c.cle} defaultChecked={coches.includes(c.cle)} />
          {c.libelle}
        </label>
      ))}
    </div>
  );
}

export default async function MailingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { id } = await params;
  const { ok, erreur } = await searchParams;
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");
  const admin = createAdminClient();
  if (!admin) redirect("/admin/mailing");

  const { data: m } = await admin.from("mailings").select("*").eq("id", id).maybeSingle<Mailing>();
  if (!m) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const apercu = composerEmail(m, { profileId: user?.id ?? id, prenom: "Jeanne" });

  // Un mailing parti : son état, et rien à modifier.
  if (m.statut !== "brouillon") {
    const arrete = envoiArrete(m);
    return (
      <PageShell nav="admin" avantTitre={<NavAdmin />} title={m.objet || "Mailing"} theme="clair">
        {m.statut === "envoi" && !arrete && <meta httpEquiv="refresh" content="5" />}
        <p className={formStyles.hint}>
          <Link href="/admin/mailing">← Tous les mailings</Link>
        </p>
        <p style={{ fontWeight: 700, fontSize: 18 }}>
          {m.statut === "envoye"
            ? `Envoyé à ${m.nb_envoyes.toLocaleString("fr-FR")} personnes.`
            : `${m.nb_envoyes.toLocaleString("fr-FR")} emails partis sur ${(m.nb_destinataires ?? 0).toLocaleString("fr-FR")}.`}
        </p>
        {m.statut === "envoi" && !arrete && (
          <p className={formStyles.hint}>L&apos;envoi est en cours. Cette page se met à jour toute seule.</p>
        )}
        {arrete && (
          <form action={reprendreEnvoi}>
            <input type="hidden" name="id" value={m.id} />
            <p className={formStyles.error}>
              L&apos;envoi s&apos;est arrêté. {m.erreur} Personne ne recevra l&apos;email deux fois.
            </p>
            <button type="submit" className={formStyles.submit}>
              Reprendre l&apos;envoi
            </button>
          </form>
        )}
        <p className={formStyles.hint} style={{ marginTop: 24 }}>
          De : {m.expediteur_nom} · Répondre à : {m.repondre_a}
        </p>
        <div
          style={{ border: "1px solid #ddd", borderRadius: 12, padding: 20, background: "#fff" }}
          dangerouslySetInnerHTML={{ __html: apercu }}
        />
      </PageShell>
    );
  }

  const [{ data: roles }, { data: langues }, { count }, credits] = await Promise.all([
    admin.from("roles").select("slug, label_fr").neq("slug", "lecteur").order("position"),
    admin.from("profile_languages").select("language_code").limit(20000),
    admin.rpc(
      "mailing_destinataires",
      { p_categories: m.categories, p_metiers: m.metiers, p_langues: m.langues },
      { count: "exact", head: true },
    ),
    creditsBrevo(),
  ]);
  const nb = count ?? 0;
  const codes = [...new Set((langues ?? []).map((l) => l.language_code as string))];
  const ordre = ["fr", "en", "es", "it", "de", "pt", "ar"];
  codes.sort((a, b) => (ordre.indexOf(a) + 1 || 99) - (ordre.indexOf(b) + 1 || 99) || a.localeCompare(b));

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Mailing" theme="clair">
      <p className={formStyles.hint}>
        <Link href="/admin/mailing">← Tous les mailings</Link>
      </p>
      {ok && MESSAGES[ok] && (
        <p className={formStyles.hint} style={{ fontWeight: 700 }}>
          {MESSAGES[ok]}
        </p>
      )}
      {erreur && ERREURS[erreur] && <p className={formStyles.error}>{ERREURS[erreur]}</p>}

      <form className={formStyles.form} action={enregistrerMailing}>
        <input type="hidden" name="id" value={m.id} />

        <h2 style={{ fontSize: 18, margin: "8px 0 0" }}>À qui ?</h2>
        <p className={formStyles.hint}>
          Rien de coché dans une ligne = tout le monde pour cette ligne. Plusieurs cases dans une ligne
          s&apos;ajoutent (auteurs ou producteurs) ; les lignes se combinent (producteurs qui parlent
          anglais).
        </p>
        <fieldset style={famille}>
          <strong>Catégorie</strong>
          <Cases nom="categories" choix={CATEGORIES_MAILING} coches={m.categories} />
        </fieldset>
        <fieldset style={famille}>
          <strong>Métier</strong>
          <Cases
            nom="metiers"
            choix={(roles ?? []).map((r) => ({ cle: r.slug as string, libelle: r.label_fr as string }))}
            coches={m.metiers}
          />
        </fieldset>
        <fieldset style={famille}>
          <strong>Langue parlée</strong>
          <Cases
            nom="langues"
            choix={codes.map((c) => ({ cle: c, libelle: nomDeLangue(c) ?? c }))}
            coches={m.langues}
          />
        </fieldset>
        <p style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>
          {nb.toLocaleString("fr-FR")} destinataire{nb > 1 ? "s" : ""}
        </p>
        <p className={formStyles.hint}>
          Ce nombre correspond au dernier enregistrement : après avoir changé les cases, cliquez sur
          « Enregistrer » pour le recalculer.
          {credits !== null && ` Emails disponibles chez Brevo : ${credits.toLocaleString("fr-FR")}.`}
        </p>

        <h2 style={{ fontSize: 18, margin: "16px 0 0" }}>De la part de qui ?</h2>
        <label className={formStyles.field}>
          <span>Nom de l&apos;expéditeur</span>
          <select name="expediteur_nom" defaultValue={m.expediteur_nom}>
            {EXPEDITEURS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>
        <label className={formStyles.field}>
          <span>Les réponses arrivent à</span>
          <select name="repondre_a" defaultValue={m.repondre_a}>
            {REPONDRE_A.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
        </label>

        <h2 style={{ fontSize: 18, margin: "16px 0 0" }}>Le message</h2>
        <label className={formStyles.field}>
          <span>Objet</span>
          <input type="text" name="objet" defaultValue={m.objet} maxLength={150} />
        </label>
        <div className={formStyles.field}>
          <span>Message</span>
          <RichTextEditor name="corps" defaultValue={m.corps} />
          <p className={formStyles.hint}>
            Écrivez {"{prénom}"} là où le prénom de la personne doit apparaître (« Bonjour {"{prénom}"}, »).
            Une adresse écrite en entier (https://…) devient un lien.
          </p>
        </div>
        <label className={formStyles.field}>
          <span>Bouton rouge sous le message (facultatif) : son texte</span>
          <input type="text" name="bouton_libelle" defaultValue={m.bouton_libelle ?? ""} maxLength={60} />
        </label>
        <label className={formStyles.field}>
          <span>Bouton : l&apos;adresse où il mène</span>
          <input type="url" name="bouton_lien" defaultValue={m.bouton_lien ?? ""} placeholder="https://" />
        </label>

        <div className={formStyles.pied} style={{ gap: 12, flexWrap: "wrap" }}>
          <button type="submit" name="suite" value="enregistrer" className={formStyles.submit}>
            Enregistrer
          </button>
          <button type="submit" name="suite" value="essai" className={formStyles.submit}>
            M&apos;envoyer un essai
          </button>
        </div>

        <h2 style={{ fontSize: 18, margin: "24px 0 0" }}>Aperçu (dernier enregistrement)</h2>
        <div
          style={{ border: "1px solid #ddd", borderRadius: 12, padding: 20, background: "#fff" }}
          dangerouslySetInnerHTML={{ __html: apercu }}
        />

        <h2 style={{ fontSize: 18, margin: "24px 0 0" }}>Envoyer</h2>
        <label className={formStyles.checkline} style={{ fontSize: 14 }}>
          <input type="checkbox" name="confirme" />
          <span>
            J&apos;ai relu l&apos;essai. Envoyer ce mailing aux destinataires choisis : un envoi parti ne se
            rattrape pas.
          </span>
        </label>
        <div className={formStyles.pied}>
          <button type="submit" name="suite" value="envoyer" className={formStyles.submit}>
            Envoyer le mailing
          </button>
        </div>
      </form>

      <form action={supprimerBrouillon} style={{ marginTop: 32 }}>
        <input type="hidden" name="id" value={m.id} />
        <button type="submit" className={formStyles.hint} style={{ background: "none", border: 0, cursor: "pointer", textDecoration: "underline" }}>
          Supprimer ce brouillon
        </button>
      </form>
    </PageShell>
  );
}
