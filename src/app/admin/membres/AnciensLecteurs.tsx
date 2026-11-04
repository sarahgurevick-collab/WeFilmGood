import Link from "next/link";
import formStyles from "@/components/form.module.css";
import { EMOJIS_SATISFACTION } from "@/lib/satisfaction";
import { createAdminClient } from "@/lib/supabase/admin";
import adminStyles from "../admin.module.css";
import styles from "./page.module.css";

/**
 * Les lecteurs de WFG 1 qui n'ont pas de compte sur le nouveau site, sous
 * la liste des lecteurs de l'écran des membres (04/11/2026, Sarah : certains
 * n'ont pas lu depuis deux ans, faute de temps, et reviennent). Toutes leurs
 * fiches sont reprises ; leur page permet de les réactiver.
 */
export default async function AnciensLecteurs({ satisfaction }: { satisfaction: boolean }) {
  const admin = createAdminClient();
  if (!admin) return null;

  // La base rend 1 000 lignes par demande : on lit par tranches.
  const fiches: { reader_legacy_id: number | null; read_at: string | null; author_rating: number | null }[] = [];
  for (let debut = 0; ; debut += 1000) {
    const { data } = await admin
      .from("legacy_reading_reports")
      .select("reader_legacy_id, read_at, author_rating")
      .neq("statut", 0)
      .order("legacy_review_id")
      .range(debut, debut + 999);
    fiches.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const { data: inscrits } = await admin.from("legacy_profiles").select("legacy_user_id").eq("role_slug", "lecteur");

  const parAncien = new Map<number, { n: number; derniere: string | null; notes: number[] }>();
  for (const i of inscrits ?? []) parAncien.set(i.legacy_user_id, { n: 0, derniere: null, notes: [] });
  for (const f of fiches) {
    if (f.reader_legacy_id == null) continue;
    const e = parAncien.get(f.reader_legacy_id) ?? { n: 0, derniere: null, notes: [] };
    e.n += 1;
    if (f.read_at && (!e.derniere || f.read_at > e.derniere)) e.derniere = f.read_at;
    if (f.author_rating && f.author_rating >= 1 && f.author_rating <= 5) e.notes.push(f.author_rating);
    parAncien.set(f.reader_legacy_id, e);
  }
  // Ceux qui ont un compte sur le nouveau site sont déjà dans la liste du dessus.
  const { data: avecCompte } = await admin
    .from("profiles")
    .select("legacy_user_id")
    .in("legacy_user_id", [...parAncien.keys()]);
  for (const p of avecCompte ?? []) parAncien.delete(p.legacy_user_id as number);

  const ids = [...parAncien.keys()];
  const { data: noms } = ids.length
    ? await admin.from("legacy_profiles").select("legacy_user_id, full_name, email").in("legacy_user_id", ids)
    : { data: [] };
  const profil = new Map((noms ?? []).map((n) => [n.legacy_user_id, n]));
  const lecteurs = ids
    .map((id) => ({
      id,
      nom: profil.get(id)?.full_name ?? `Compte supprimé (n° ${id})`,
      email: profil.get(id)?.email ?? null,
      ...parAncien.get(id)!,
    }))
    .sort((a, b) => (b.derniere ?? "").localeCompare(a.derniere ?? ""));

  return (
    <>
      <h2 className={adminStyles.subhead}>Anciens lecteurs</h2>
      <p className={formStyles.hint}>
        {lecteurs.length} lecteurs de l&apos;ancien site, sans compte sur le nouveau. Leurs fiches sont
        toutes reprises. Du plus récemment actif au plus ancien ; ouvrez une fiche pour réactiver le
        lecteur.
      </p>
      <div className={adminStyles.tableWrap}>
        <table className={adminStyles.table}>
          <thead>
            <tr>
              <th>Lecteur</th>
              <th>Fiches</th>
              <th>Dernière fiche</th>
              {satisfaction && <th>Satisfaction des auteurs</th>}
            </tr>
          </thead>
          <tbody>
            {lecteurs.map((l) => (
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
                <td>
                  <Link href={`/admin/lecteurs/ancien/${l.id}`}>{l.n}</Link>
                </td>
                <td>{l.derniere ? new Date(l.derniere).toLocaleDateString("fr-FR") : "—"}</td>
                {satisfaction && (
                  <td className={styles.satisfaction}>
                    <Link href={`/admin/lecteurs/ancien/${l.id}`}>
                      {EMOJIS_SATISFACTION.map((emoji, i) => {
                        const n = l.notes.filter((x) => x === i + 1).length;
                        return (
                          <span key={emoji} className={n ? undefined : styles.satisfactionZero}>
                            {emoji} {n}
                          </span>
                        );
                      })}
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
