import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import adminStyles from "../admin.module.css";
import { createClient } from "@/lib/supabase/server";
import { activerAdhesion, expirerAdhesion } from "./actions";

type Profil = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  category: string | null;
};

type Adhesion = {
  id: string;
  profile_id: string;
  plan_slug: string;
  status: string;
  started_at: string | null;
  created_at: string;
};

export default async function AdminAdhesionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const recherche = (q ?? "").trim();

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    redirect("/");
  }

  let requete = supabase
    .from("profiles")
    .select("id, full_name, display_name, category")
    .order("full_name", { ascending: true })
    .limit(40);

  if (recherche) {
    requete = requete.or(`full_name.ilike.%${recherche}%,display_name.ilike.%${recherche}%`);
  }

  const { data: profils } = await requete.returns<Profil[]>();

  const ids = (profils ?? []).map((p) => p.id);
  const { data: adhesions } = ids.length
    ? await supabase
        .from("memberships")
        .select("id, profile_id, plan_slug, status, started_at, created_at")
        .in("profile_id", ids)
        .order("created_at", { ascending: false })
        .returns<Adhesion[]>()
    : { data: [] as Adhesion[] };

  const derniereAdhesionDe = (profileId: string) =>
    (adhesions ?? []).find((a) => a.profile_id === profileId) ?? null;

  return (
    <PageShell eyebrow="Administration" title="Adhésions" wide>
      <p className={formStyles.linkRow} style={{ marginBottom: 24 }}>
        <Link href="/admin">Codes lecteurs</Link>
        {" · "}
        <Link href="/admin/projets-en-attente">Projets en attente</Link>
      </p>

      <p className={formStyles.hint}>
        Aucun paiement en ligne n&apos;est branché : c&apos;est ici qu&apos;on
        active ou expire une adhésion à la main après réception d&apos;un
        paiement. Une adhésion active débloque, pour le membre, la lecture
        des messages reçus sur ses projets.
      </p>

      <form method="get" style={{ marginTop: 24, marginBottom: 8 }}>
        <input
          type="search"
          name="q"
          defaultValue={recherche}
          placeholder="Chercher un membre par nom…"
          style={{
            width: "100%",
            maxWidth: 360,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid var(--bordure)",
            background: "transparent",
            color: "inherit",
            fontSize: 14,
          }}
        />
      </form>

      <table className={adminStyles.table}>
        <thead>
          <tr>
            <th>Membre</th>
            <th>Catégorie</th>
            <th>Adhésion</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(profils ?? []).length === 0 && (
            <tr>
              <td colSpan={4} style={{ color: "var(--dim)" }}>
                {recherche ? "Aucun membre trouvé." : "Tapez un nom pour chercher un membre."}
              </td>
            </tr>
          )}
          {(profils ?? []).map((p) => {
            const adhesion = derniereAdhesionDe(p.id);
            const active = adhesion?.status === "active";
            return (
              <tr key={p.id}>
                <td>{p.display_name || p.full_name || "Sans nom"}</td>
                <td>{p.category ?? "—"}</td>
                <td>
                  {adhesion ? (
                    <>
                      {adhesion.status}
                      <span className={adminStyles.badge}>{adhesion.plan_slug}</span>
                    </>
                  ) : (
                    "Aucune"
                  )}
                </td>
                <td>
                  {active ? (
                    <form action={expirerAdhesion}>
                      <input type="hidden" name="membership_id" value={adhesion!.id} />
                      <button type="submit" className={adminStyles.linkButton}>
                        Expirer
                      </button>
                    </form>
                  ) : (
                    <form action={activerAdhesion}>
                      <input type="hidden" name="profile_id" value={p.id} />
                      <button type="submit" className={adminStyles.linkButton}>
                        Activer
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </PageShell>
  );
}
