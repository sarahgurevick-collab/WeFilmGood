import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { COLONNES, dureeLisible, tailleLisible, type Depot } from "@/lib/videopitch";
import NavAdmin from "../NavAdmin";
import adminStyles from "../admin.module.css";
import { refuserVideopitch, validerVideopitch } from "./actions";

/**
 * Les videopitchs déposés par les auteurs (22/10/2026). Pour chacun : la
 * vidéo allégée à regarder sur place, le bouton pour la télécharger et la
 * déposer sur Vimeo, puis le lien Vimeo à coller — ou le refus, avec motif.
 */

type Ligne = Depot & {
  project: { id: string; title: string } | null;
  deposant: { full_name: string | null } | null;
};

const SELECTION = `${COLONNES}, project:projects(id, title), deposant:profiles!videopitch_depots_deposant_id_fkey(full_name)`;

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

const ETATS: Record<string, string> = {
  envoi: "envoi en cours",
  recu: "reçu, en attente de conversion",
  preparation: "conversion en cours",
  echec: "vidéo illisible",
  valide: "validé",
  refuse: "refusé",
};

export default async function VideopitchsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");
  const admin = createAdminClient();
  if (!admin) return null;

  const [{ data: aValider }, { data: enCours }, { data: traites }] = await Promise.all([
    admin.from("videopitch_depots").select(SELECTION).eq("etat", "a_valider").order("recu_le", { ascending: true }).returns<Ligne[]>(),
    admin
      .from("videopitch_depots")
      .select(SELECTION)
      .in("etat", ["envoi", "recu", "preparation", "echec"])
      .order("cree_le", { ascending: false })
      .limit(20)
      .returns<Ligne[]>(),
    admin
      .from("videopitch_depots")
      .select(SELECTION)
      .in("etat", ["valide", "refuse"])
      .order("traite_le", { ascending: false })
      .limit(30)
      .returns<Ligne[]>(),
  ]);

  const titre = (l: Ligne) =>
    l.project ? <Link href={`/projet/${l.project.id}`}>{l.project.title}</Link> : <>—</>;

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title={`Videopitchs à valider${aValider?.length ? ` (${aValider.length})` : ""}`} theme="clair">
      {erreur && <p className={formStyles.error}>{erreur}</p>}
      <p className={formStyles.hint}>
        Chaque vidéo a été allégée par le serveur (720p, moins de 100 Mo). Regardez-la ici, puis
        téléchargez-la et déposez-la sur Vimeo ; collez enfin le lien Vimeo pour la mettre en ligne
        sur la fiche. L&apos;auteur reçoit un e-mail à la validation comme au refus.
      </p>

      {(aValider ?? []).length === 0 ? (
        <p className={formStyles.hint}>Aucun videopitch en attente.</p>
      ) : (
        <div style={{ display: "grid", gap: 28, marginTop: 20 }}>
          {(aValider ?? []).map((l) => (
            <section
              key={l.id}
              style={{ display: "grid", gridTemplateColumns: "minmax(260px, 420px) 1fr", gap: 24, alignItems: "start", padding: 18, border: "1px solid #e4e4e4", borderRadius: 10 }}
            >
              <div>
                <video
                  controls
                  preload="metadata"
                  src={`/api/videopitch/depots/${l.id}/video`}
                  style={{ width: "100%", maxHeight: 420, background: "#000", borderRadius: 6 }}
                />
                <p className={formStyles.hint} style={{ marginTop: 6 }}>
                  {dureeLisible(l.duree_secondes)} · {tailleLisible(l.taille_allegee)} ·{" "}
                  <a href={`/api/videopitch/depots/${l.id}/video?telecharger=1`}>Télécharger pour Vimeo</a>
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 16 }}>{titre(l)}</p>
                <p className={formStyles.hint} style={{ marginTop: 4 }}>
                  {l.deposant?.full_name ?? "—"} · version {l.langue === "en" ? "anglaise" : "française"} · reçu le{" "}
                  {date(l.recu_le)}
                  {l.nom_origine ? ` · fichier d'origine : ${l.nom_origine} (${tailleLisible(l.taille_annoncee)})` : ""}
                </p>

                <form action={validerVideopitch} style={{ marginTop: 16 }}>
                  <input type="hidden" name="depot_id" value={l.id} />
                  <label className={formStyles.field}>
                    <span>Lien Vimeo de la vidéo, une fois déposée</span>
                    <input type="text" name="lien" placeholder="https://vimeo.com/123456789" required />
                  </label>
                  <button type="submit" className={formStyles.submit} style={{ marginTop: 8 }}>
                    Mettre en ligne sur la fiche
                  </button>
                </form>

                <form action={refuserVideopitch} style={{ marginTop: 18 }}>
                  <input type="hidden" name="depot_id" value={l.id} />
                  <label className={formStyles.field}>
                    <span>Ou refuser, en expliquant pourquoi (l&apos;auteur recevra ce texte)</span>
                    <textarea name="motif" rows={3} />
                  </label>
                  <button type="submit" className={adminStyles.linkButton} style={{ marginTop: 8 }}>
                    Refuser et prévenir l&apos;auteur
                  </button>
                </form>
              </div>
            </section>
          ))}
        </div>
      )}

      {(enCours ?? []).length > 0 && (
        <>
          <h2 className={adminStyles.subhead}>En cours</h2>
          <table className={adminStyles.table}>
            <thead>
              <tr>
                <th>Projet</th>
                <th>Auteur</th>
                <th>Langue</th>
                <th>État</th>
                <th>Depuis</th>
              </tr>
            </thead>
            <tbody>
              {(enCours ?? []).map((l) => (
                <tr key={l.id}>
                  <td>{titre(l)}</td>
                  <td>{l.deposant?.full_name ?? "—"}</td>
                  <td>{l.langue.toUpperCase()}</td>
                  <td>
                    {ETATS[l.etat] ?? l.etat}
                    {l.etat === "envoi" && ` (${tailleLisible(l.taille_recue)} sur ${tailleLisible(l.taille_annoncee)})`}
                    {l.etat === "echec" && l.erreur && <span className={formStyles.hint}> — {l.erreur}</span>}
                  </td>
                  <td>{date(l.cree_le)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {(traites ?? []).length > 0 && (
        <>
          <h2 className={adminStyles.subhead}>Derniers traités</h2>
          <table className={adminStyles.table}>
            <thead>
              <tr>
                <th>Projet</th>
                <th>Auteur</th>
                <th>Langue</th>
                <th>Décision</th>
                <th>Le</th>
              </tr>
            </thead>
            <tbody>
              {(traites ?? []).map((l) => (
                <tr key={l.id}>
                  <td>{titre(l)}</td>
                  <td>{l.deposant?.full_name ?? "—"}</td>
                  <td>{l.langue.toUpperCase()}</td>
                  <td>
                    {l.etat === "valide" ? (
                      <>
                        Mis en ligne{l.vimeo_id && <> · <a href={`https://vimeo.com/${l.vimeo_id}`}>vimeo.com/{l.vimeo_id}</a></>}
                      </>
                    ) : (
                      <>Refusé{l.motif_refus && <span className={formStyles.hint}> — {l.motif_refus}</span>}</>
                    )}
                  </td>
                  <td>{date(l.traite_le)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </PageShell>
  );
}
