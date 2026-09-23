import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import adminStyles from "../admin.module.css";
import TableauFiches, { type LigneFiche } from "./TableauFiches";

/**
 * Le tableau de toutes les fiches de lecture — celles de WFG 1 et celles
 * rendues sur WFG 2 —, repris de la page « analysis-list-admin » de
 * l'ancien site, dont Sarah se sert très souvent.
 *
 * Les années se cochent, l'année en cours par défaut : les 5 800 fiches
 * d'un coup font une page lourde, et ce sont les deux dernières années
 * qui servent.
 *
 * Les fiches et les adresses des lecteurs ne sont lisibles qu'avec le
 * client à privilèges, ouvert ici seulement après la vérification admin.
 */

const PREMIERE_ANNEE = 2017;
const EXTRAIT = 600;

type Heritee = {
  legacy_review_id: number;
  read_at: string | null;
  content: string | null;
  final_mark: number | null;
  author_rating: number | null;
  reader_legacy_id: number | null;
  project: {
    id: string;
    title: string;
    format: string | null;
    language: string | null;
    owner: { full_name: string | null } | null;
  } | null;
};

type Rendue = {
  id: string;
  status: string;
  score: number | null;
  content: string | null;
  submitted_at: string;
  reader_id: string;
  project: Heritee["project"];
};

const PROJET = "project:projects(id, title, format, language, owner:profiles!projects_owner_id_fkey(full_name))";

const STATUTS: Record<string, string> = {
  soumise: "À valider",
  validee_admin: "Publiée",
  rejetee_admin: "Rejetée",
};

function extrait(texte: string | null, html: boolean): string {
  if (!texte) return "";
  const brut = (html ? texte.replace(/<[^>]+>/g, " ") : texte)
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return brut.length > EXTRAIT ? `${brut.slice(0, EXTRAIT)}…` : brut;
}

/** La base ne renvoie que 1 000 lignes par demande : on lit par tranches. */
async function toutLire<T>(
  lire: (debut: number, fin: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const tranche = 1000;
  const lignes: T[] = [];
  for (let debut = 0; ; debut += tranche) {
    const { data } = await lire(debut, debut + tranche - 1);
    lignes.push(...(data ?? []));
    if (!data || data.length < tranche) return lignes;
  }
}

export default async function TableauFichesPage({
  searchParams,
}: {
  searchParams: Promise<{ annees?: string }>;
}) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/");

  const admin = createAdminClient();
  if (!admin) redirect("/admin");

  const anneeEnCours = new Date().getFullYear();
  const { annees: brutes } = await searchParams;
  const cochees = (
    brutes === undefined
      ? [anneeEnCours]
      : brutes.split(",").map(Number).filter((a) => a >= PREMIERE_ANNEE && a <= anneeEnCours + 1)
  ).sort((a, b) => b - a);

  const parAnnee = await Promise.all(
    cochees.map((annee) => {
      const debut = `${annee}-01-01`;
      const fin = `${annee + 1}-01-01`;
      return Promise.all([
        toutLire<Heritee>((a, b) =>
          admin
            .from("legacy_reading_reports")
            .select(`legacy_review_id, read_at, content, final_mark, author_rating, reader_legacy_id, ${PROJET}`)
            .gte("read_at", debut)
            .lt("read_at", fin)
            .order("read_at", { ascending: false })
            .range(a, b)
            .returns<Heritee[]>(),
        ),
        toutLire<Rendue>((a, b) =>
          admin
            .from("reading_reports")
            .select(`id, status, score, content, submitted_at, reader_id, ${PROJET}`)
            .gte("submitted_at", debut)
            .lt("submitted_at", fin)
            .order("submitted_at", { ascending: false })
            .range(a, b)
            .returns<Rendue[]>(),
        ),
      ]);
    }),
  );
  const heritees = parAnnee.flatMap(([h]) => h);
  const rendues = parAnnee.flatMap(([, r]) => r);

  // Lecteurs de WFG 1 : leur ancien profil (nom, adresse), sinon leur
  // compte WFG 2 quand le profil repris a déjà été rattaché.
  const idsAnciens = [...new Set(heritees.map((f) => f.reader_legacy_id).filter((id): id is number => id != null))];
  const [{ data: anciens }, { data: rattaches }] = idsAnciens.length
    ? await Promise.all([
        admin.from("legacy_profiles").select("legacy_user_id, full_name, email").in("legacy_user_id", idsAnciens),
        admin.from("profiles").select("id, full_name, legacy_user_id").in("legacy_user_id", idsAnciens),
      ])
    : [{ data: [] }, { data: [] }];

  const lecteurAncien = new Map<number, { nom: string | null; email: string | null }>();
  for (const l of anciens ?? []) lecteurAncien.set(l.legacy_user_id, { nom: l.full_name, email: l.email });

  // Adresses des comptes WFG 2 : lecteurs rattachés sans profil repris,
  // et lecteurs des fiches rendues sur le nouveau site.
  const aChercher = new Map<string, string | null>();
  for (const p of rattaches ?? []) {
    if (!lecteurAncien.has(p.legacy_user_id)) aChercher.set(p.id, p.full_name);
  }
  for (const r of rendues) if (!aChercher.has(r.reader_id)) aChercher.set(r.reader_id, null);

  const { data: nomsWfg2 } = aChercher.size
    ? await admin.from("profiles").select("id, full_name").in("id", [...aChercher.keys()])
    : { data: [] };
  const comptes = new Map<string, { nom: string | null; email: string | null }>();
  await Promise.all(
    [...aChercher.keys()].map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      comptes.set(id, {
        nom: nomsWfg2?.find((n) => n.id === id)?.full_name ?? aChercher.get(id) ?? null,
        email: data.user?.email ?? null,
      });
    }),
  );
  for (const p of rattaches ?? []) {
    if (!lecteurAncien.has(p.legacy_user_id)) {
      lecteurAncien.set(p.legacy_user_id, comptes.get(p.id) ?? { nom: p.full_name, email: null });
    }
  }

  const lignes: LigneFiche[] = [
    ...heritees.map((f) => {
      const lecteur = f.reader_legacy_id != null ? lecteurAncien.get(f.reader_legacy_id) : undefined;
      return {
        cle: `h${f.legacy_review_id}`,
        date: f.read_at,
        lecteur: lecteur?.nom ?? null,
        lecteurEmail: lecteur?.email ?? null,
        scenariste: f.project?.owner?.full_name ?? null,
        titre: f.project?.title ?? null,
        projetId: f.project?.id ?? null,
        format: f.project?.format ?? null,
        langue: f.project?.language ?? null,
        statut: "Vérifiée",
        note: f.final_mark,
        analyse: extrait(f.content, false),
        satisfaction: f.author_rating || null,
        lienFiche: null,
      };
    }),
    ...rendues.map((r) => {
      const lecteur = comptes.get(r.reader_id);
      return {
        cle: `r${r.id}`,
        date: r.submitted_at,
        lecteur: lecteur?.nom ?? null,
        lecteurEmail: lecteur?.email ?? null,
        scenariste: r.project?.owner?.full_name ?? null,
        titre: r.project?.title ?? null,
        projetId: r.project?.id ?? null,
        format: r.project?.format ?? null,
        langue: r.project?.language ?? null,
        statut: STATUTS[r.status] ?? r.status,
        note: r.score,
        analyse: extrait(r.content, true),
        satisfaction: null,
        lienFiche: `/admin/fiches/${r.id}`,
      };
    }),
  ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  const annees: number[] = [];
  for (let a = Math.max(anneeEnCours, 2027); a >= PREMIERE_ANNEE; a--) annees.push(a);

  return (
    <PageShell eyebrow="Administration" title="Fiches de lecture" theme="clair">
      <p className={formStyles.hint}>
        Toutes les analyses rendues par les lecteurs et les notes attribuées, de WFG 1 et du
        nouveau site.
      </p>

      <nav className={adminStyles.annees} aria-label="Années">
        {annees.map((a) => {
          const cochee = cochees.includes(a);
          const suivantes = cochee ? cochees.filter((c) => c !== a) : [...cochees, a];
          return (
            <Link
              key={a}
              href={`/admin/fiches?annees=${suivantes.sort((x, y) => y - x).join(",")}`}
              className={cochee ? adminStyles.anneeActive : adminStyles.annee}
              aria-pressed={cochee}
            >
              {cochee ? "✓ " : ""}
              {a}
            </Link>
          );
        })}
      </nav>

      {cochees.length === 0 ? (
        <p className={formStyles.hint} style={{ marginTop: 24 }}>
          Cochez une ou plusieurs années.
        </p>
      ) : (
        <TableauFiches lignes={lignes} />
      )}
    </PageShell>
  );
}
