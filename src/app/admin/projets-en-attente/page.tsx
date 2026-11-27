import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import NavAdmin from "../NavAdmin";
import formStyles from "@/components/form.module.css";
import adminStyles from "../admin.module.css";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import FormulaireAttribuer from "./FormulaireAttribuer";
import MemoProjet from "./MemoProjet";
import LienScenario from "../LienScenario";
import { LANGUES_PAR_DEFAUT } from "@/lib/langues";

type PendingProject = {
  project_id: string;
  author_name: string | null;
  author_email: string | null;
  title: string;
  format: string | null;
  language: string | null;
  submitted_at: string;
  current_reader_id: string | null;
  current_reader_name: string | null;
  reader_refusal_count: number;
  reading_status: string;
};

type Reader = {
  profile_id: string;
  profile: { full_name: string | null } | null;
};

const ETATS: Record<string, string> = {
  sans_lecteur: "Sans lecteur",
  proposee: "Proposée au lecteur",
  en_cours: "Acceptée, en lecture",
  rendue: "Fiche rendue",
  refusee: "Refusée par le lecteur",
};

/**
 * Ce qui demande une action de Sarah, c'est une lecture refusée ou
 * proposée sans réponse : seul cet état s'affiche en rouge. Le délai
 * depuis le paiement reste en blanc, en jours seulement (Sarah, 27/11).
 */
const ETATS_A_TRAITER = new Set(["proposee", "refusee"]);
const ROUGE_ALERTE = { color: "#e2231a", fontWeight: 600 } as const;

const FORMATS_COURTS: Record<string, string> = {
  long_metrage: "LM",
  court_metrage: "CM",
  serie: "TV",
  immersif_360_vr: "VR",
};

const LANGUES: Record<string, string> = { fr: "fr", en: "ang" };

function formatCourt(format: string | null, langue: string | null): string {
  const abrege = format ? (FORMATS_COURTS[format] ?? format) : null;
  const lang = langue ? (LANGUES[langue] ?? langue) : null;
  if (!abrege) return lang ? `(${lang})` : "—";
  return lang ? `${abrege} (${lang})` : abrege;
}

function depuisJours(date: string): string {
  return `${Math.floor((Date.now() - new Date(date).getTime()) / 86400000)} jour(s)`;
}

/** « 2026/09/25 à 19h », comme sur WFG 1. */
function dateWfg1(date: string): string {
  const d = new Date(new Date(date).toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${z(d.getMonth() + 1)}/${z(d.getDate())} à ${d.getHours()}h`;
}


export default async function ProjetsEnAttentePage() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    redirect("/");
  }

  const { data: pendingRows } = await supabase.rpc("admin_pending_projects");

  // La reprise du 19/09 a mis tous les projets de WFG 1 au statut « déposé » :
  // ~3 900 projets déjà lus ou jamais soumis à la lecture. Et créer une fiche
  // sur WFG 2 ne demande pas une lecture. Seuls comptent ici les projets dont
  // la lecture est payée (09/11, Sarah : « on envoie son scénario en payant
  // 50 euros ») : le bouton « Envoyer » de l'onglet Documents, migration 0249.
  // La file en cours sur l'ancien site est entrée le 14/11 avec la dernière
  // copie : une demande « reprise » à 0 € par projet (migration 0276).
  const { data: nouveaux } = await supabase
    .from("lecture_demandes")
    .select("project_id")
    .eq("status", "payee")
    .returns<{ project_id: string }[]>();
  const idsNouveaux = new Set((nouveaux ?? []).map((n) => n.project_id));
  // Du plus récent au plus ancien (16/11, Sarah).
  const projects = ((pendingRows ?? []) as PendingProject[])
    .filter((p) => idsNouveaux.has(p.project_id))
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

  // Les mémos de l'administration, une ligne par projet (17/11).
  const { data: memosRows } = await supabase
    .from("projet_memos_admin")
    .select("project_id, memo")
    .returns<{ project_id: string; memo: string }[]>();
  const memoDe = new Map((memosRows ?? []).map((m) => [m.project_id, m.memo]));

  const { data: readers } = await supabase
    .from("profile_roles")
    .select("profile_id, profile:profiles(full_name)")
    .eq("role_slug", "lecteur")
    .returns<Reader[]>();

  // Le voyant que chaque lecteur règle lui-même : l'attribution se fait
  // tous les jours en fonction des disponibilités, autant les montrer
  // plutôt que de les faire retenir.
  const { data: voyants } = await supabase
    .from("reader_profiles")
    .select("profile_id, availability_status, formats, langues")
    .returns<{ profile_id: string; availability_status: string; formats: string[] | null; langues: string[] | null }[]>();

  // Les formats que chaque lecteur peut lire (27/09) : un lecteur n'est
  // proposé que pour les projets de ses formats ; sans aucun format, il
  // n'est plus proposé du tout.
  const formatsDe = new Map((voyants ?? []).map((v) => [v.profile_id, v.formats]));
  // Et les langues qu'il a lui-même cochées dans son profil (16/10).
  const languesDe = new Map((voyants ?? []).map((v) => [v.profile_id, v.langues]));
  const peutLire = (lecteur: string, format: string | null, langue: string | null) => {
    const formats = formatsDe.get(lecteur);
    // Sans langue enregistrée, un lecteur lit le français, pas tout (24/11, Sarah).
    const langues = languesDe.get(lecteur) ?? LANGUES_PAR_DEFAUT;
    const formatOk = !formats || (format ? formats.includes(format) : formats.length > 0);
    const langueOk = langue ? langues.includes(langue) : langues.length > 0;
    return formatOk && langueOk;
  };

  // Pour la colonne « Lecteurs assignés » : l'état de la mission et le jour
  // où le lecteur l'a reçue ; pour le menu : l'email de chaque lecteur.
  const { data: missions } = projects.length
    ? await supabase
        .from("reading_assignments")
        .select("project_id, reader_id, status, assigned_at, responded_at, created_at")
        .in("project_id", projects.map((p) => p.project_id))
        .order("created_at", { ascending: false })
    : { data: [] };
  const missionDe = new Map<string, { status: string; recu: string | null }>();
  // Tous les lecteurs déjà passés sur chaque projet (21/11, Sarah) : sous le
  // titre, pour ne pas reproposer un projet à celui qui l'a déjà lu.
  const dejaLusPar = new Map<string, { reader_id: string; status: string }[]>();
  for (const m of missions ?? []) {
    const l = dejaLusPar.get(m.project_id) ?? [];
    if (!l.some((x) => x.reader_id === m.reader_id)) l.push({ reader_id: m.reader_id, status: m.status });
    dejaLusPar.set(m.project_id, l);
  }
  for (const m of missions ?? []) {
    if (!missionDe.has(m.project_id))
      missionDe.set(m.project_id, { status: m.status, recu: m.responded_at ?? m.assigned_at ?? m.created_at });
  }
  const service = createAdminClient();

  // Les noms des lecteurs déjà passés, et la bio de chaque auteur (21/11,
  // Sarah : amateur ou pro, elle n'attribue pas les mêmes lecteurs).
  const idsProjets = projects.map((p) => p.project_id);
  const { data: proprios } = idsProjets.length
    ? await (service ?? supabase).from("projects").select("id, owner_id").in("id", idsProjets).returns<{ id: string; owner_id: string }[]>()
    : { data: [] };
  const proprioDe = new Map((proprios ?? []).map((x) => [x.id, x.owner_id]));
  const idsProfils = [
    ...new Set([
      ...(proprios ?? []).map((x) => x.owner_id),
      ...[...dejaLusPar.values()].flat().map((x) => x.reader_id),
    ]),
  ];
  const { data: profilsRows } = idsProfils.length
    ? await (service ?? supabase)
        .from("profiles")
        .select("id, full_name, biofilmo")
        .in("id", idsProfils)
        .returns<{ id: string; full_name: string | null; biofilmo: string | null }[]>()
    : { data: [] };
  const profilDe = new Map((profilsRows ?? []).map((x) => [x.id, x]));

  // Les analyses rendues sur WFG 1 comptent aussi (22/11, Sarah : « le
  // projet a déjà été analysé mais tu ne le vois pas ») : elles sont dans
  // les fiches héritées, avec le numéro de compte WFG 1 du lecteur.
  const { data: heriteesBrutes } = idsProjets.length
    ? await (service ?? supabase)
        .from("legacy_reading_reports")
        .select("project_id, reader_legacy_id, final_mark, read_at, content")
        .in("project_id", idsProjets)
        .order("read_at", { ascending: false })
        .returns<{ project_id: string; reader_legacy_id: number | null; final_mark: number | null; read_at: string | null; content: string | null }[]>()
    : { data: [] };
  // WFG 1 ouvrait une fiche vide à la création du projet, avant toute
  // attribution : ni lecteur, ni texte, ni note. Ce n'est pas une analyse
  // (24/11, Sarah : « Déjà vu par : ? (Fiche rendue…, 0) » sur Selqi).
  const analysees = (heriteesBrutes ?? []).filter((h) => h.reader_legacy_id != null || (h.content ?? "").trim() !== "");
  const idsAnciens = [...new Set(analysees.map((h) => h.reader_legacy_id).filter((n): n is number => n != null))];
  const nomAncien = new Map<number, string>();
  if (idsAnciens.length) {
    const [{ data: anciens }, { data: repris }] = await Promise.all([
      (service ?? supabase).from("legacy_profiles").select("legacy_user_id, full_name").in("legacy_user_id", idsAnciens)
        .returns<{ legacy_user_id: number; full_name: string | null }[]>(),
      (service ?? supabase).from("profiles").select("legacy_user_id, full_name").in("legacy_user_id", idsAnciens)
        .returns<{ legacy_user_id: number; full_name: string | null }[]>(),
    ]);
    for (const a of anciens ?? []) if (a.full_name) nomAncien.set(a.legacy_user_id, a.full_name);
    for (const a of repris ?? []) if (a.full_name) nomAncien.set(a.legacy_user_id, a.full_name);
  }
  const analysesWfg1 = new Map<string, string[]>();
  for (const h of analysees) {
    const nom = (h.reader_legacy_id != null && nomAncien.get(h.reader_legacy_id)) || "?";
    const jour = h.read_at ? new Date(h.read_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "2-digit" }) : null;
    const detail = [ETATS.rendue, jour ? `le ${jour}` : null].filter(Boolean).join(" ") + (h.final_mark != null ? `, ${h.final_mark}` : "");
    analysesWfg1.set(h.project_id, [...(analysesWfg1.get(h.project_id) ?? []), `${nom} (${detail})`]);
  }

  // Les liens signés (1 h) vers les scénarios, demandés en une seule fois.
  // Un lien demandé ligne par ligne (17/11) : avec une centaine de projets,
  // une partie des demandes échouait et le carré vert manquait au hasard.
  const lienScenario = new Map<string, string>();
  if (projects.length) {
    const { data: fichiers } = await (service ?? supabase)
      .from("project_files")
      .select("project_id, storage_path, uploaded_at")
      .in("project_id", projects.map((p) => p.project_id))
      .eq("kind", "scenario")
      .order("uploaded_at", { ascending: false })
      .returns<{ project_id: string; storage_path: string }[]>();
    const cheminDe = new Map<string, string>();
    for (const f of fichiers ?? []) {
      if (!cheminDe.has(f.project_id)) cheminDe.set(f.project_id, f.storage_path);
    }
    const chemins = [...cheminDe.values()];
    const { data: signes } = chemins.length
      ? await (service ?? supabase).storage.from("scenarios").createSignedUrls(chemins, 60 * 60)
      : { data: [] };
    const urlDe = new Map((signes ?? []).map((u) => [u.path, u.signedUrl]));
    for (const [projet, chemin] of cheminDe) {
      const url = urlDe.get(chemin);
      if (url) lienScenario.set(projet, url);
    }
  }

  const emailDe = new Map<string, string>();
  if (service) {
    await Promise.all(
      (readers ?? []).map(async (r) => {
        const { data } = await service.auth.admin.getUserById(r.profile_id);
        if (data.user?.email) emailDe.set(r.profile_id, data.user.email);
      }),
    );
  }

  const voyantDe = new Map(
    (voyants ?? []).map((v) => [v.profile_id, v.availability_status]),
  );
  // Les plus actifs d'abord (16/11, Sarah) : celui qui a rendu une fiche le
  // plus récemment est en tête, ceux qui n'ont jamais lu sont en queue.
  const { data: dernieres } = await supabase.rpc("derniere_lecture_par_lecteur");
  const derniereDe = new Map(
    ((dernieres ?? []) as { profile_id: string; derniere: string | null }[]).map((d) => [d.profile_id, d.derniere ?? ""]),
  );
  const plusActifs = (a: { profile_id: string; profile: { full_name: string | null } | null }, b: typeof a) =>
    (derniereDe.get(b.profile_id) ?? "").localeCompare(derniereDe.get(a.profile_id) ?? "") ||
    (a.profile?.full_name ?? "").localeCompare(b.profile?.full_name ?? "");
  // Le nombre de projets déjà proposés ou en cours chez chaque lecteur (17/11,
  // Sarah) : affiché à côté de son nom dans le menu.
  const { data: occupes } = await supabase
    .from("reading_assignments")
    .select("reader_id")
    .in("status", ["proposee", "en_cours"])
    .returns<{ reader_id: string }[]>();
  const projetsDe = new Map<string, number>();
  for (const o of occupes ?? []) projetsDe.set(o.reader_id, (projetsDe.get(o.reader_id) ?? 0) + 1);
  const pastille = (id: string) => (projetsDe.get(id) ? ` 🔴 ${projetsDe.get(id)}` : "");
  const parVoyant = (couleur: string) =>
    (readers ?? [])
      .filter((r) => (voyantDe.get(r.profile_id) ?? "vert") === couleur)
      .sort(plusActifs);

  // Les lecteurs sans aucune case cochée (16/11, Sarah : « je ne les utilise
  // qu'en dernier recours ») : jamais proposés d'office, mais toujours
  // attribuables à la main, tout en bas du menu.
  const dernierRecours = (readers ?? [])
    .filter((r) => formatsDe.get(r.profile_id)?.length === 0)
    .sort((a, b) => (a.profile?.full_name ?? "").localeCompare(b.profile?.full_name ?? ""));

  const GROUPES = [
    { couleur: "vert", libelle: "Disponibles" },
    { couleur: "orange", libelle: "Peu disponibles" },
    { couleur: "rouge", libelle: "Indisponibles" },
  ];

  return (
    <PageShell nav="admin"
      avantTitre={<NavAdmin />}

      title="Projets en attente (pas de lecteur ou lecteur inactif)"
    >

      {(projects ?? []).length === 0 ? (
        <p className={formStyles.hint} style={{ marginTop: 24 }}>
          Aucun projet en attente.
        </p>
      ) : (
        <table className={adminStyles.table} style={{ marginTop: 24 }}>
          <thead>
            <tr>
              <th>Scénariste</th>
              <th>Titre</th>
              <th></th>
              <th>Format</th>
              <th>Payé il y a</th>
              <th>Lecteurs assignés</th>
              <th>Nombre de refus</th>
              <th>Attribuer lecteur</th>
            </tr>
          </thead>
          <tbody>
            {(projects ?? []).map((p) => {
              const mission = missionDe.get(p.project_id);
              return (
                <tr key={p.project_id}>
                  <td>
                    <strong
                      title={profilDe.get(proprioDe.get(p.project_id) ?? "")?.biofilmo?.slice(0, 800) || "Pas de bio renseignée"}
                      style={{ cursor: "help" }}
                    >
                      {p.author_name ?? "Sans nom"}
                    </strong>
                    <br />
                    <em className={formStyles.hint}>{p.author_email}</em>
                  </td>
                  <td>
                    <MemoProjet projectId={p.project_id} memo={memoDe.get(p.project_id) ?? null} titre={p.title} />
                    {(dejaLusPar.get(p.project_id) ?? []).length + (analysesWfg1.get(p.project_id) ?? []).length > 0 && (
                      <div className={formStyles.hint} style={{ marginTop: 4, fontSize: 12 }}>
                        Déjà vu par :{" "}
                        {[
                          ...(dejaLusPar.get(p.project_id) ?? []).map(
                            (x) => `${profilDe.get(x.reader_id)?.full_name ?? "?"} (${ETATS[x.status] ?? x.status})`,
                          ),
                          ...(analysesWfg1.get(p.project_id) ?? []),
                        ].join(", ")}
                      </div>
                    )}
                  </td>
                  <td>
                    {lienScenario.has(p.project_id) && (
                      <LienScenario href={lienScenario.get(p.project_id)!} />
                    )}
                  </td>
                  <td>{formatCourt(p.format, p.language)}</td>
                  <td>{depuisJours(p.submitted_at)}</td>
                  <td>
                    {p.current_reader_name ?? "—"}
                    {mission && p.current_reader_name && (
                      <>
                        <br />
                        <span
                          className={adminStyles.etatMission}
                          style={ETATS_A_TRAITER.has(mission.status) ? ROUGE_ALERTE : undefined}
                        >
                          {mission.status === "en_cours" ? "Analyse en cours" : (ETATS[mission.status] ?? mission.status)}
                          {mission.recu && ` (reçu le ${dateWfg1(mission.recu)})`}
                        </span>
                      </>
                    )}
                  </td>
                  <td>{p.reader_refusal_count ?? 0}</td>
                  <td>
                    <FormulaireAttribuer projectId={p.project_id}>
                        <option value="" disabled>
                          Email du lecteur
                        </option>
                        {GROUPES.map(({ couleur, libelle }) => {
                          const lecteurs = parVoyant(couleur).filter((r) => peutLire(r.profile_id, p.format, p.language));
                          if (lecteurs.length === 0) return null;
                          return (
                            <optgroup key={couleur} label={libelle}>
                              {lecteurs.map((r) => (
                                <option key={r.profile_id} value={r.profile_id}>
                                  {r.profile?.full_name ?? r.profile_id.slice(0, 8)}
                                  {emailDe.get(r.profile_id) ? ` - ${emailDe.get(r.profile_id)}` : ""}
                                  {pastille(r.profile_id)}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                        {dernierRecours.length > 0 && (
                          <optgroup label="En dernier recours">
                            {dernierRecours.map((r) => (
                              <option key={r.profile_id} value={r.profile_id}>
                                {r.profile?.full_name ?? r.profile_id.slice(0, 8)}
                                {emailDe.get(r.profile_id) ? ` - ${emailDe.get(r.profile_id)}` : ""}
                                  {pastille(r.profile_id)}
                              </option>
                            ))}
                          </optgroup>
                        )}
                    </FormulaireAttribuer>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </PageShell>
  );
}
