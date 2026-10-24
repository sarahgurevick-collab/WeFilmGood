import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import NavAdmin from "../NavAdmin";
import adminStyles from "../admin.module.css";
import { modererCommentaire, programmerCineCrush, reglerFiltreIa, retirerCineCrush } from "./actions";

/**
 * CinéCrush, côté administration (24/10/2026, Sarah) : la programmation,
 * une semaine par projet (du dimanche minuit au dimanche minuit), les
 * candidats proposés, les commentaires mis de côté par le filtre IA, et
 * l'interrupteur du filtre.
 */

type Semaine = {
  id: string;
  semaine: string;
  project: { id: string; title: string; owner: { full_name: string | null } | null } | null;
};

type Candidat = { id: string; title: string; auteur: string | null; personnages: number; remplissage: number };

type Commentaire = {
  id: string;
  contenu: string;
  statut: string;
  motif_ia: string | null;
  cree_le: string;
  auteur: { full_name: string | null } | null;
  crush: { semaine: string; project: { title: string } | null } | null;
};

const dateLongue = (iso: string) =>
  new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** Le prochain dimanche libre, au format AAAA-MM-JJ. */
function prochainDimancheLibre(pris: Set<string>, dimancheEnCours: string): string {
  const d = new Date(dimancheEnCours + "T12:00:00Z");
  for (let i = 0; i < 520; i++) {
    const iso = d.toISOString().slice(0, 10);
    if (!pris.has(iso)) return iso;
    d.setUTCDate(d.getUTCDate() + 7);
  }
  return dimancheEnCours;
}

export default async function CineCrushAdminPage({
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

  const [{ data: semaines }, { data: candidatsBruts }, { data: enAttente }, { data: reglage }, { data: dimanche }] =
    await Promise.all([
      admin
        .from("cinecrush")
        .select("id, semaine, project:projects(id, title, owner:profiles!projects_owner_id_fkey(full_name))")
        .order("semaine", { ascending: false })
        .returns<Semaine[]>(),
      supabase.rpc("cinecrush_candidats", { p_limite: 60 }),
      admin
        .from("cinecrush_commentaires")
        .select("id, contenu, statut, motif_ia, cree_le, auteur:profiles!cinecrush_commentaires_auteur_id_fkey(full_name), crush:cinecrush(semaine, project:projects(title))")
        .eq("statut", "en_attente")
        .order("cree_le", { ascending: true })
        .returns<Commentaire[]>(),
      admin.from("cinecrush_reglages").select("valeur").eq("cle", "filtre_ia").maybeSingle<{ valeur: boolean }>(),
      supabase.rpc("dimanche_de_la_semaine").returns<string>(),
    ]);

  const candidats = (candidatsBruts ?? []) as unknown as Candidat[];
  const dimancheEnCours = (dimanche as unknown as string) ?? new Date().toISOString().slice(0, 10);
  const pris = new Set((semaines ?? []).map((s) => s.semaine));
  const prochain = prochainDimancheLibre(pris, dimancheEnCours);
  const filtre = reglage?.valeur ?? true;

  const etat = (s: Semaine) =>
    s.semaine === dimancheEnCours ? "en cours" : s.semaine > dimancheEnCours ? "à venir" : "passée";

  return (
    <PageShell nav="admin" avantTitre={<NavAdmin />} title="CinéCrush" theme="clair">
      {erreur && <p className={formStyles.error}>{erreur}</p>}
      <p className={formStyles.hint}>
        Un projet par semaine, du dimanche minuit au dimanche minuit. Les semaines à venir sont
        annoncées sur la page CinéCrush (titre et image seulement) ; l&apos;auteur reçoit un e-mail
        quand vous le programmez.
      </p>

      <h2 className={adminStyles.subhead}>Programmer une semaine</h2>
      <form action={programmerCineCrush} style={{ display: "grid", gap: 12, maxWidth: 520 }}>
        <label className={formStyles.field}>
          <span>Dimanche de début</span>
          <input type="date" name="semaine" defaultValue={prochain} step={7} required />
        </label>
        <label className={formStyles.field}>
          <span>Un candidat (fiches les mieux remplies d&apos;abord)</span>
          <select name="project_id" defaultValue="">
            <option value="">— choisir dans la liste —</option>
            {candidats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
                {c.auteur ? ` — ${c.auteur}` : ""} · {c.personnages} personnage{c.personnages > 1 ? "s" : ""} · fiche {c.remplissage}/5
              </option>
            ))}
          </select>
        </label>
        <label className={formStyles.field}>
          <span>… ou le titre exact d&apos;un autre projet</span>
          <input type="text" name="titre" placeholder="Titre du projet" maxLength={200} />
        </label>
        <div>
          <button type="submit" className={formStyles.submit}>
            Programmer
          </button>
        </div>
      </form>

      <h2 className={adminStyles.subhead}>La programmation</h2>
      {(semaines ?? []).length === 0 ? (
        <p className={formStyles.hint}>Aucune semaine programmée.</p>
      ) : (
        <table className={adminStyles.table}>
          <thead>
            <tr>
              <th>Semaine du</th>
              <th>Projet</th>
              <th>Auteur</th>
              <th>État</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(semaines ?? []).map((s) => (
              <tr key={s.id}>
                <td>{dateLongue(s.semaine)}</td>
                <td>{s.project ? <Link href={`/projet/${s.project.id}`}>{s.project.title}</Link> : "—"}</td>
                <td>{s.project?.owner?.full_name ?? "—"}</td>
                <td>{etat(s)}</td>
                <td>
                  <form action={retirerCineCrush}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className={adminStyles.linkButton}>
                      Retirer
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className={adminStyles.subhead}>
        Commentaires mis de côté par le filtre{(enAttente ?? []).length ? ` (${enAttente!.length})` : ""}
      </h2>
      <form action={reglerFiltreIa} className={adminStyles.inlineForm} style={{ marginBottom: 12 }}>
        <input type="hidden" name="valeur" value={filtre ? "non" : "oui"} />
        <span className={formStyles.hint}>Filtre IA : {filtre ? "allumé" : "éteint"}.</span>
        <button type="submit" className={adminStyles.linkButton}>
          {filtre ? "Éteindre" : "Allumer"}
        </button>
      </form>
      {(enAttente ?? []).length === 0 ? (
        <p className={formStyles.hint}>Rien en attente.</p>
      ) : (
        <table className={adminStyles.table}>
          <thead>
            <tr>
              <th>Quand</th>
              <th>Qui</th>
              <th>Sous</th>
              <th>Commentaire</th>
              <th>Motif du filtre</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(enAttente ?? []).map((c) => (
              <tr key={c.id}>
                <td>{new Date(c.cree_le).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</td>
                <td>{c.auteur?.full_name ?? "—"}</td>
                <td>{c.crush?.project?.title ?? "—"}</td>
                <td style={{ whiteSpace: "pre-wrap", maxWidth: 420 }}>{c.contenu}</td>
                <td>{c.motif_ia ?? "—"}</td>
                <td>
                  <form action={modererCommentaire} className={adminStyles.inlineForm}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" name="geste" value="publier" className={adminStyles.linkButton}>
                      Publier
                    </button>
                    <button type="submit" name="geste" value="retirer" className={adminStyles.linkButton}>
                      Retirer
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}
