import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import NavAdmin from "../NavAdmin";
import formStyles from "@/components/form.module.css";
import adminStyles from "../admin.module.css";
import { createClient } from "@/lib/supabase/server";
import { createReaderCode, toggleReaderCode } from "../actions";

/**
 * Les codes d'invitation des lecteurs : quelques usages par an, rangés
 * derrière le bouton clé de la page d'attribution.
 */
export default async function CodesLecteursPage() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    redirect("/");
  }

  const { data: codes } = await supabase
    .from("reader_invite_codes")
    .select("code, label, max_uses, use_count, is_active, created_at")
    .order("created_at", { ascending: false });

  const { data: redemptions } = await supabase
    .from("reader_invite_redemptions")
    .select("code, redeemed_at, profile:profiles(full_name)")
    .order("redeemed_at", { ascending: false })
    .returns<
      {
        code: string;
        redeemed_at: string;
        profile: { full_name: string | null } | null;
      }[]
    >();

  return (
    <PageShell
      avantTitre={<NavAdmin />}
      eyebrow="Administration"
      title="Codes lecteurs"
      theme="clair"
    >
      <p className={formStyles.hint}>
        Chaque code donne accès au formulaire d&apos;inscription lecteur, à
        l&apos;adresse <code>/lecteur/inscription</code>. Cette page et ce
        formulaire ne sont liés nulle part ailleurs sur le site — seule cette
        page en admin les montre.
      </p>

      <form
        className={formStyles.form}
        action={createReaderCode}
        style={{ marginTop: 32 }}
      >
        <label className={formStyles.field}>
          <span>Note (ex. nom du lecteur)</span>
          <input type="text" name="label" placeholder="Philippe Gourgeon" />
        </label>
        <label className={formStyles.field}>
          <span>Utilisations max (laisser vide = illimité)</span>
          <input type="number" name="max_uses" min={1} placeholder="1" />
        </label>
        <button type="submit" className={formStyles.submit}>
          Générer un code
        </button>
      </form>

      <table className={adminStyles.table}>
        <thead>
          <tr>
            <th>Code</th>
            <th>Note</th>
            <th>Usages</th>
            <th>Statut</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(codes ?? []).length === 0 && (
            <tr>
              <td colSpan={5} style={{ color: "var(--dim)" }}>
                Aucun code généré pour l&apos;instant.
              </td>
            </tr>
          )}
          {(codes ?? []).map((c) => (
            <tr key={c.code}>
              <td>
                <code>{c.code}</code>
              </td>
              <td>{c.label ?? "—"}</td>
              <td>
                {c.use_count}
                {c.max_uses ? ` / ${c.max_uses}` : ""}
              </td>
              <td>{c.is_active ? "Actif" : "Désactivé"}</td>
              <td>
                <form action={toggleReaderCode}>
                  <input type="hidden" name="code" value={c.code} />
                  <input
                    type="hidden"
                    name="next_state"
                    value={(!c.is_active).toString()}
                  />
                  <button type="submit" className={adminStyles.linkButton}>
                    {c.is_active ? "Désactiver" : "Réactiver"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className={adminStyles.subhead}>Lecteurs inscrits</h2>
      {(redemptions ?? []).length === 0 ? (
        <p className={formStyles.hint}>
          Aucun lecteur inscrit pour l&apos;instant.
        </p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {(redemptions ?? []).map((r, i) => (
            <li key={i} style={{ fontSize: 13 }}>
              <strong>{r.profile?.full_name ?? "Sans nom"}</strong>
              <span className={formStyles.hint}>
                {" "}
                — code {r.code},{" "}
                {new Date(r.redeemed_at).toLocaleDateString("fr-FR")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
