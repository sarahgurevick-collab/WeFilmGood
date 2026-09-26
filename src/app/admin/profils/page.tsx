import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import NavAdmin from "../NavAdmin";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import adminStyles from "../admin.module.css";
import { basculerValidation } from "./actions";
import { prendreLaPlace } from "./prise-de-place";
import { createAdminClient } from "@/lib/supabase/admin";

type Membre = {
  profile_id: string;
  full_name: string | null;
  email: string | null;
  category: string | null;
  country: string | null;
  validation_status: string;
  created_at: string;
};

/**
 * Les profils récemment créés, et leur référence professionnelle.
 *
 * Le corps de métier principal — producteur, réalisateur… — suppose au
 * moins une expérience sur un film, un court métrage ou un clip. C'est
 * l'administration qui en juge, sur la référence fournie : page IMDb,
 * Vimeo ou site personnel.
 *
 * Les compétences supplémentaires (monteur, comédien, sound designer…)
 * ne sont pas vérifiées : on fait confiance.
 *
 * Un profil qui a fourni une référence est présumé valable — vert. Le
 * clic ne sert qu'à écarter une référence factice, qui passe au rouge.
 * Les auteurs ne sont pas concernés : aucune validation pour eux.
 */
export default async function ProfilsPage() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const [{ data: membresBruts }, { data: sites }, { data: lecteurs }] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase
      .from("profiles")
      .select("id, website")
      .returns<{ id: string; website: string | null }[]>(),
    supabase.from("profile_roles").select("profile_id").eq("role_slug", "lecteur"),
  ]);

  // Ne restent que les nouveaux talents à valider : ni les lecteurs, dont le profil
  // n'est vu que d'eux-mêmes, ni les comptes repris de WFG 1 le 19/09
  // (métadonnée imported_from), qui ne sont pas des inscriptions.
  const exclus = new Set((lecteurs ?? []).map((l) => l.profile_id));
  const service = createAdminClient();
  if (service) {
    for (let page = 1; ; page++) {
      const { data } = await service.auth.admin.listUsers({ page, perPage: 1000 });
      const comptes = data?.users ?? [];
      for (const c of comptes) if (c.user_metadata?.imported_from) exclus.add(c.id);
      if (comptes.length < 1000) break;
    }
  }

  const siteDe = new Map((sites ?? []).map((s) => [s.id, s.website]));
  const membres = ((membresBruts ?? []) as Membre[])
    // Seuls les profils qui demandent une validation (producteurs, talents) :
    // les auteurs sont actifs dès l'inscription, rien à juger ici.
    .filter((m) => !exclus.has(m.profile_id) && m.validation_status !== "non_requise")
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 60);

  return (
    <PageShell nav="admin"
      avantTitre={<NavAdmin />}
     
      title="Profils"
      theme="clair"
    >
      <p className={formStyles.hint}>
        Les <strong>auteurs</strong> n&apos;ont pas de validation : leur profil
        est actif dès l&apos;inscription. Pour les{" "}
        <strong>producteurs et autres talents</strong>, le métier suppose au
        moins une expérience sur un film, prouvée par la référence fournie (page
        IMDb, Vimeo, site). S&apos;il y a une référence, le profil est validé
        d&apos;office : vous n&apos;avez rien à faire. Ne cliquez sur
        «&nbsp;Validé&nbsp;» que si la référence est fausse, pour la refuser —
        un second clic la rétablit. Sans référence, le profil reste en attente.
      </p>

      <div className={adminStyles.tableWrap}>
        <table className={adminStyles.table}>
          <thead>
            <tr>
              <th>Membre</th>
              <th>Métier</th>
              <th>Référence professionnelle</th>
              <th>Inscrit</th>
              <th>Validation</th>
              <th>Agir pour lui</th>
            </tr>
          </thead>
          <tbody>
            {membres.map((m) => {
              const site = siteDe.get(m.profile_id) ?? null;
              const refusee = m.validation_status === "refusee";
              // Un auteur n'a rien à prouver : pas de validation pour lui.
              const sansValidation =
                m.category === "auteur" ||
                m.validation_status === "non_requise";

              return (
                <tr key={m.profile_id}>
                  <td>
                    <Link href={`/membres/${m.profile_id}`}>
                      {m.full_name ?? "Sans nom"}
                    </Link>
                    <br />
                    <span className={formStyles.hint}>{m.email}</span>
                  </td>
                  <td>{m.category ?? "—"}</td>
                  <td>
                    {site ? (
                      <a href={site} target="_blank" rel="noopener noreferrer">
                        {site.replace(/^https?:\/\/(www\.)?/, "").slice(0, 44)}
                      </a>
                    ) : (
                      <span className={formStyles.hint}>aucune référence</span>
                    )}
                  </td>
                  <td>{new Date(m.created_at).toLocaleDateString("fr-FR")}</td>
                  <td>
                    {sansValidation ? (
                      <span className={formStyles.hint}>
                        sans objet (auteur)
                      </span>
                    ) : site ? (
                      <form action={basculerValidation}>
                        <input
                          type="hidden"
                          name="profile_id"
                          value={m.profile_id}
                        />
                        <input
                          type="hidden"
                          name="vers"
                          value={refusee ? "validee" : "refusee"}
                        />
                        <button
                          type="submit"
                          className={
                            refusee
                              ? adminStyles.voyantRouge
                              : adminStyles.voyantVert
                          }
                          title={
                            refusee
                              ? "Référence écartée — cliquer pour la rétablir"
                              : "Référence acceptée — cliquer pour l'écarter"
                          }
                        >
                          {refusee ? "Non valide" : "Validé"}
                        </button>
                      </form>
                    ) : (
                      <span className={formStyles.hint}>
                        en attente — pas de référence
                      </span>
                    )}
                  </td>
                  <td>
                    <form action={prendreLaPlace}>
                      <input
                        type="hidden"
                        name="profile_id"
                        value={m.profile_id}
                      />
                      <button
                        type="submit"
                        className={adminStyles.linkButton}
                        title="Se connecter à sa place pour compléter son profil ou déposer un document"
                      >
                        Prendre sa place
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
