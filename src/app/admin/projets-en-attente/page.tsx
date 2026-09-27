import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import NavAdmin from "../NavAdmin";
import formStyles from "@/components/form.module.css";
import adminStyles from "../admin.module.css";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reassignReader } from "./actions";
import ScenarioLink from "./ScenarioLink";

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
 * L'objectif est de rendre l'analyse en 10 jours. Une date seule oblige
 * à compter de tête : on affiche le délai écoulé, et il passe en rouge
 * dès 6 jours — assez tôt pour réattribuer le projet avant l'échéance,
 * plutôt que de constater le retard une fois qu'il est là.
 */
const ALERTE_JOURS = 6;

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

function joursDepuis(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

function depuisJoursHeures(date: string): string {
  const heures = Math.floor((Date.now() - new Date(date).getTime()) / 3600000);
  return `${Math.floor(heures / 24)} jour(s), ${heures % 24} heure(s)`;
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
  // ~3 900 projets déjà lus ou jamais soumis à la lecture. Seuls comptent
  // ici les projets déposés sur le nouveau site (sans numéro WFG 1). La file
  // en cours sur l'ancien site arrivera avec la dernière copie, à la bascule.
  const { data: nouveaux } = await supabase
    .from("projects")
    .select("id")
    .in("status", ["depose", "en_lecture"])
    .is("legacy_id", null);
  const idsNouveaux = new Set((nouveaux ?? []).map((n) => n.id));
  const projects = ((pendingRows ?? []) as PendingProject[]).filter((p) =>
    idsNouveaux.has(p.project_id),
  );

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
    .select("profile_id, availability_status, formats")
    .returns<{ profile_id: string; availability_status: string; formats: string[] | null }[]>();

  // Les formats que chaque lecteur peut lire (27/09) : un lecteur n'est
  // proposé que pour les projets de ses formats ; sans aucun format, il
  // n'est plus proposé du tout.
  const formatsDe = new Map((voyants ?? []).map((v) => [v.profile_id, v.formats]));
  const peutLire = (lecteur: string, format: string | null) => {
    const formats = formatsDe.get(lecteur);
    return !formats || (format ? formats.includes(format) : formats.length > 0);
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
  for (const m of missions ?? []) {
    if (!missionDe.has(m.project_id))
      missionDe.set(m.project_id, { status: m.status, recu: m.responded_at ?? m.assigned_at ?? m.created_at });
  }
  const service = createAdminClient();
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
  const parVoyant = (couleur: string) =>
    (readers ?? [])
      .filter((r) => (voyantDe.get(r.profile_id) ?? "vert") === couleur)
      .sort((a, b) =>
        (a.profile?.full_name ?? "").localeCompare(b.profile?.full_name ?? ""),
      );

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
                    <strong>{p.author_name ?? "Sans nom"}</strong>
                    <br />
                    <em className={formStyles.hint}>{p.author_email}</em>
                  </td>
                  <td>{p.title}</td>
                  <td>
                    <ScenarioLink projectId={p.project_id} />
                  </td>
                  <td>{formatCourt(p.format, p.language)}</td>
                  <td
                    style={
                      joursDepuis(p.submitted_at) >= ALERTE_JOURS
                        ? { color: "#e2231a", fontWeight: 600 }
                        : undefined
                    }
                  >
                    {depuisJoursHeures(p.submitted_at)}
                  </td>
                  <td>
                    {p.current_reader_name ?? "—"}
                    {mission && p.current_reader_name && (
                      <>
                        <br />
                        <span className={adminStyles.etatMission}>
                          {mission.status === "en_cours" ? "Analyse en cours" : (ETATS[mission.status] ?? mission.status)}
                          {mission.recu && ` (reçu le ${dateWfg1(mission.recu)})`}
                        </span>
                      </>
                    )}
                  </td>
                  <td>{p.reader_refusal_count ?? 0}</td>
                  <td>
                    <form action={reassignReader} className={adminStyles.attribuer}>
                      <input type="hidden" name="project_id" value={p.project_id} />
                      <select name="reader_id" defaultValue="" required>
                        <option value="" disabled>
                          Email du lecteur
                        </option>
                        {GROUPES.map(({ couleur, libelle }) => {
                          const lecteurs = parVoyant(couleur).filter((r) => peutLire(r.profile_id, p.format));
                          if (lecteurs.length === 0) return null;
                          return (
                            <optgroup key={couleur} label={libelle}>
                              {lecteurs.map((r) => (
                                <option key={r.profile_id} value={r.profile_id}>
                                  {r.profile?.full_name ?? r.profile_id.slice(0, 8)}
                                  {emailDe.get(r.profile_id) ? ` - ${emailDe.get(r.profile_id)}` : ""}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                      <button type="submit" className={adminStyles.boutonAssigner}>
                        Assigner
                      </button>
                    </form>
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
