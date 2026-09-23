import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import adminStyles from "../admin.module.css";
import NavAdmin from "../NavAdmin";
import { prendreLaPlace } from "../profils/prise-de-place";

/**
 * Tous les lecteurs, et l'accès à l'espace de chacun.
 *
 * Un profil lecteur n'est vu que de lui-même : pour voir ce qu'il voit, on
 * prend sa place (« Voir son espace »), puis « Revenir à mon compte ».
 */

const VOYANTS: Record<string, string> = {
  vert: "Disponible",
  orange: "Peu disponible",
  rouge: "Indisponible",
};

export default async function LecteursPage() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const admin = createAdminClient();
  if (!admin) redirect("/admin");

  const { data: roles } = await admin
    .from("profile_roles")
    .select("profile_id, profile:profiles(full_name, legacy_user_id)")
    .eq("role_slug", "lecteur")
    .returns<
      {
        profile_id: string;
        profile: {
          full_name: string | null;
          legacy_user_id: number | null;
        } | null;
      }[]
    >();

  const ids = (roles ?? []).map((r) => r.profile_id);
  const idsAnciens = (roles ?? [])
    .map((r) => r.profile?.legacy_user_id)
    .filter((id): id is number => id != null);

  const [
    { data: profilsLecteur },
    { data: rendues },
    { data: anciennes },
    emails,
  ] = await Promise.all([
    ids.length
      ? admin
          .from("reader_profiles")
          .select("profile_id, availability_status")
          .in("profile_id", ids)
      : Promise.resolve({
          data: [] as { profile_id: string; availability_status: string }[],
        }),
    ids.length
      ? admin.from("reading_reports").select("reader_id").in("reader_id", ids)
      : Promise.resolve({ data: [] as { reader_id: string }[] }),
    idsAnciens.length
      ? admin
          .from("legacy_reading_reports")
          .select("reader_legacy_id, read_at")
          .in("reader_legacy_id", idsAnciens)
          .eq("statut", 2)
      : Promise.resolve({
          data: [] as { reader_legacy_id: number; read_at: string | null }[],
        }),
    Promise.all(
      ids.map(
        async (id) =>
          [
            id,
            (await admin.auth.admin.getUserById(id)).data.user?.email ?? null,
          ] as const,
      ),
    ),
  ]);

  const voyantDe = new Map(
    (profilsLecteur ?? []).map((p) => [p.profile_id, p.availability_status]),
  );
  const emailDe = new Map(emails);
  const fichesNouvelles = new Map<string, number>();
  for (const r of rendues ?? [])
    fichesNouvelles.set(
      r.reader_id,
      (fichesNouvelles.get(r.reader_id) ?? 0) + 1,
    );
  const fichesAnciennes = new Map<
    number,
    { n: number; derniere: string | null }
  >();
  for (const f of anciennes ?? []) {
    const e = fichesAnciennes.get(f.reader_legacy_id) ?? {
      n: 0,
      derniere: null,
    };
    e.n += 1;
    if (f.read_at && (!e.derniere || f.read_at > e.derniere))
      e.derniere = f.read_at;
    fichesAnciennes.set(f.reader_legacy_id, e);
  }

  const lecteurs = (roles ?? [])
    .map((r) => {
      const ancien =
        r.profile?.legacy_user_id != null
          ? fichesAnciennes.get(r.profile.legacy_user_id)
          : undefined;
      return {
        id: r.profile_id,
        nom: r.profile?.full_name ?? "—",
        email: emailDe.get(r.profile_id) ?? null,
        voyant: voyantDe.get(r.profile_id) ?? "vert",
        fiches: (ancien?.n ?? 0) + (fichesNouvelles.get(r.profile_id) ?? 0),
        derniere: ancien?.derniere ?? null,
      };
    })
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return (
    <PageShell avantTitre={<NavAdmin />} title="Lecteurs" theme="clair">
      <p className={formStyles.hint}>
        {lecteurs.length} lecteurs. Leur profil n&apos;est visible que
        d&apos;eux-mêmes : « Voir son espace » vous met à la place du lecteur,
        tel qu&apos;il se voit. Un bandeau en haut de page permet de revenir à
        votre compte.
      </p>

      <table className={adminStyles.table} style={{ marginTop: 24 }}>
        <thead>
          <tr>
            <th>Lecteur</th>
            <th>Disponibilité</th>
            <th>Fiches</th>
            <th>Dernière fiche</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lecteurs.map((l) => (
            <tr key={l.id}>
              <td>
                <Link href={`/admin/lecteurs/${l.id}`}>
                  <strong>{l.nom}</strong>
                </Link>
                <br />
                <span className={formStyles.hint}>{l.email}</span>
              </td>
              <td>{VOYANTS[l.voyant] ?? l.voyant}</td>
              <td>{l.fiches}</td>
              <td>
                {l.derniere
                  ? new Date(l.derniere).toLocaleDateString("fr-FR")
                  : "—"}
              </td>
              <td>
                <form action={prendreLaPlace}>
                  <input type="hidden" name="profile_id" value={l.id} />
                  <button type="submit" className={adminStyles.linkButton}>
                    Voir son espace
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageShell>
  );
}
