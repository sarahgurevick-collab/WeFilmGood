import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import adminStyles from "../admin.module.css";
import NavAdmin from "../NavAdmin";
import { prendreLaPlace } from "../profils/prise-de-place";
import Factures, { SELECTION_FACTURES, versFactures } from "./Factures";

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

  const { data: facturesBrutes } = await admin
    .from("reader_invoices")
    .select(SELECTION_FACTURES)
    .order("created_at", { ascending: false });
  const aPayer = versFactures(facturesBrutes).filter((f) => !f.payee);

  // Les anciens lecteurs de WFG 1 sans compte sur le nouveau site : ceux
  // qui ont rendu des fiches, et ceux inscrits comme lecteurs sans en avoir
  // rendu. La base rend 1 000 lignes par demande : on lit par tranches.
  const toutesFiches: {
    reader_legacy_id: number | null;
    read_at: string | null;
  }[] = [];
  for (let debut = 0; ; debut += 1000) {
    const { data } = await admin
      .from("legacy_reading_reports")
      .select("reader_legacy_id, read_at")
      .neq("statut", 0)
      .range(debut, debut + 999);
    toutesFiches.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const { data: inscrits } = await admin
    .from("legacy_profiles")
    .select("legacy_user_id")
    .eq("role_slug", "lecteur");
  const actifs = new Set(idsAnciens);
  const parAncien = new Map<number, { n: number; derniere: string | null }>();
  for (const i of inscrits ?? [])
    parAncien.set(i.legacy_user_id, { n: 0, derniere: null });
  for (const f of toutesFiches) {
    if (f.reader_legacy_id == null) continue;
    const e = parAncien.get(f.reader_legacy_id) ?? { n: 0, derniere: null };
    e.n += 1;
    if (f.read_at && (!e.derniere || f.read_at > e.derniere))
      e.derniere = f.read_at;
    parAncien.set(f.reader_legacy_id, e);
  }
  for (const id of actifs) parAncien.delete(id);
  const idsInactifs = [...parAncien.keys()];
  const { data: nomsAnciens } = idsInactifs.length
    ? await admin
        .from("legacy_profiles")
        .select("legacy_user_id, full_name, email")
        .in("legacy_user_id", idsInactifs)
    : { data: [] };
  const profilAncien = new Map(
    (nomsAnciens ?? []).map((n) => [n.legacy_user_id, n]),
  );
  const anciensLecteurs = idsInactifs
    .map((id) => ({
      id,
      nom: profilAncien.get(id)?.full_name ?? `Compte supprimé (n° ${id})`,
      email: profilAncien.get(id)?.email ?? null,
      ...parAncien.get(id)!,
    }))
    .sort((a, b) => (b.derniere ?? "").localeCompare(a.derniere ?? ""));

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
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="Lecteurs" theme="clair">
      <p className={formStyles.hint}>
        {lecteurs.length} lecteurs. Leur profil n&apos;est visible que
        d&apos;eux-mêmes : « Voir son espace » vous met à la place du lecteur,
        tel qu&apos;il se voit. Un bandeau en haut de page permet de revenir à
        votre compte.
      </p>

      <h2 className={adminStyles.subhead}>Factures à payer</h2>
      {aPayer.length === 0 ? (
        <p className={formStyles.hint}>
          Aucune facture en attente de paiement.
        </p>
      ) : (
        <Factures factures={aPayer} retour="/admin/lecteurs" avecLecteur />
      )}

      <h2 className={adminStyles.subhead}>Lecteurs actifs</h2>
      <table className={adminStyles.table}>
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

      <h2 className={adminStyles.subhead}>Anciens lecteurs</h2>
      <p className={formStyles.hint}>
        {anciensLecteurs.length} lecteurs de l&apos;ancien site, sans compte sur
        le nouveau. Leurs fiches sont toutes reprises. Du plus récemment actif
        au plus ancien ; ouvrez une fiche pour réactiver le lecteur.
      </p>
      <table className={adminStyles.table}>
        <thead>
          <tr>
            <th>Lecteur</th>
            <th>Fiches</th>
            <th>Dernière fiche</th>
          </tr>
        </thead>
        <tbody>
          {anciensLecteurs.map((l) => (
            <tr key={l.id}>
              <td>
                <Link href={`/admin/lecteurs/ancien/${l.id}`}>
                  <strong>{l.nom}</strong>
                </Link>
                {l.email && (
                  <>
                    <br />
                    <span className={formStyles.hint}>{l.email}</span>
                  </>
                )}
              </td>
              <td>{l.n}</td>
              <td>
                {l.derniere
                  ? new Date(l.derniere).toLocaleDateString("fr-FR")
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageShell>
  );
}
