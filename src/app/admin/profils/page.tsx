import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import adminStyles from "../admin.module.css";
import { basculerValidation } from "./actions";

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
 */
export default async function ProfilsPage() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const [{ data: membresBruts }, { data: sites }] = await Promise.all([
    supabase.rpc("admin_list_users"),
    supabase
      .from("profiles")
      .select("id, website")
      .returns<{ id: string; website: string | null }[]>(),
  ]);

  const siteDe = new Map((sites ?? []).map((s) => [s.id, s.website]));
  const membres = ((membresBruts ?? []) as Membre[])
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 60);

  return (
    <PageShell eyebrow="Administration" title="Profils récents" wide>
      <p className={formStyles.hint}>
        Le métier principal suppose au moins une expérience professionnelle sur
        un film. Un profil qui fournit une référence est présumé valable :
        cliquez seulement pour écarter une référence factice.
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
            </tr>
          </thead>
          <tbody>
            {membres.map((m) => {
              const site = siteDe.get(m.profile_id) ?? null;
              const refusee = m.validation_status === "refusee";

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
                    {site ? (
                      <form action={basculerValidation}>
                        <input type="hidden" name="profile_id" value={m.profile_id} />
                        <input
                          type="hidden"
                          name="vers"
                          value={refusee ? "validee" : "refusee"}
                        />
                        <button
                          type="submit"
                          className={refusee ? adminStyles.voyantRouge : adminStyles.voyantVert}
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
                      <span className={formStyles.hint}>en attente</span>
                    )}
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
