import { redirect } from "next/navigation";
import ChampNote from "./ChampNote";
import PageShell from "@/components/PageShell";
import NavAdmin from "../../NavAdmin";
import formStyles from "@/components/form.module.css";
import adminStyles from "../../admin.module.css";
import RichTextEditor from "@/components/RichTextEditor";
import { sanitizeFiche } from "@/lib/sanitize";
import { createClient } from "@/lib/supabase/server";
import { enregistrerBrouillon, publishReport } from "./actions";
import { FORMATS } from "@/app/projet/ChampsFiche";
import PanneauFilmsAVoir from "../PanneauFilmsAVoir";
import LienScenario from "../../LienScenario";

type Report = {
  id: string;
  reader_id: string;
  content: string | null;
  score: number | null;
  label_motivation: string | null;
  status: string;
  submitted_at: string;
  project: { id: string; title: string; format: string | null; owner: { full_name: string | null } | null } | null;
  reader: { full_name: string | null } | null;
};

export default async function FicheAdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ enregistre?: string }>;
}) {
  const { reportId } = await params;
  const { enregistre } = await searchParams;

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    redirect("/");
  }

  const { data: report } = await supabase
    .from("reading_reports")
    .select(
      "id, reader_id, content, score, label_motivation, status, submitted_at, project:projects(id, title, format, owner:profiles!projects_owner_id_fkey(full_name)), reader:profiles!reading_reports_reader_id_fkey(full_name)",
    )
    .eq("id", reportId)
    .maybeSingle<Report>();

  if (!report) {
    redirect("/admin/fiches-a-valider");
  }

  // Si la fiche a déjà été publiée, c'est cette version qu'on retravaille.
  const { data: publication } = await supabase
    .from("reading_report_publications")
    .select("content, score, published_at")
    .eq("reading_report_id", reportId)
    .maybeSingle();

  // Les corrections enregistrées sans être publiées (bouton « Enregistrer »,
  // 16/11) passent avant tout le reste.
  const { data: brouillon } = await supabase
    .from("fiches_brouillons_admin")
    .select("content, score, reader_id, enregistre_le")
    .eq("reading_report_id", reportId)
    .maybeSingle<{ content: string; score: number | null; reader_id: string | null; enregistre_le: string }>();

  // Passé par le filtre avant d'entrer dans l'éditeur : c'est là que
  // l'ancienne mise en forme est traduite, sans quoi l'éditeur la
  // supprimerait en silence.
  const content = sanitizeFiche(brouillon?.content ?? publication?.content ?? report.content ?? "");

  // Le lecteur peut être changé au moment de la validation (27/09) : fiche
  // refaite par un autre, lecteur malade… C'est lui qui sera payé.
  const { data: roles } = await supabase
    .from("profile_roles")
    .select("profile_id, profile:profiles(full_name)")
    .eq("role_slug", "lecteur")
    .returns<{ profile_id: string; profile: { full_name: string | null } | null }[]>();
  const lecteurs = (roles ?? [])
    .map((r) => ({ id: r.profile_id, nom: r.profile?.full_name ?? r.profile_id.slice(0, 8) }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const score = brouillon?.score ?? publication?.score ?? report.score ?? 0;

  // Le PDF lu par le lecteur, à ouvrir dans un autre onglet (28/11, Sarah) :
  // la dernière version déposée avant la remise de la fiche, sinon la
  // dernière tout court.
  let scenarioUrl: string | null = null;
  if (report.project?.id) {
    const { data: pdfs } = await supabase
      .from("project_files")
      .select("storage_path, uploaded_at")
      .eq("project_id", report.project.id)
      .eq("kind", "scenario")
      .order("uploaded_at", { ascending: false });
    const liste = (pdfs ?? []) as { storage_path: string; uploaded_at: string }[];
    const pdf = liste.find((f) => f.uploaded_at <= report.submitted_at) ?? liste[0];
    if (pdf) {
      const { data: signe } = await supabase.storage.from("scenarios").createSignedUrl(pdf.storage_path, 60 * 60);
      scenarioUrl = signe?.signedUrl ?? null;
    }
  }

  return (
    <PageShell nav="admin"
      avantTitre={<NavAdmin />}
      eyebrow={`Fiche de lecture${FORMATS.find((f) => f.value === report.project?.format)?.label ? ` · ${FORMATS.find((f) => f.value === report.project?.format)?.label}` : ""}`}
      title={report.project?.title ?? "Projet"}
      theme="clair"
    >
      <p className={formStyles.hint}>
        Projet de {report.project?.owner?.full_name ?? "—"}
        {scenarioUrl && (
          <span style={{ marginLeft: 12, verticalAlign: "middle", display: "inline-block" }}>
            <LienScenario href={scenarioUrl} />
          </span>
        )}
      </p>

      <p className={formStyles.hint}>
        Rendue par {report.reader?.full_name ?? "—"} le{" "}
        {new Date(report.submitted_at).toLocaleDateString("fr-FR")} · note du
        lecteur {report.score ?? "—"} / 200
        {publication &&
          ` · publiée le ${new Date(publication.published_at).toLocaleDateString("fr-FR")}`}
        {brouillon &&
          ` · enregistrée le ${new Date(brouillon.enregistre_le).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })}`}
      </p>

      <p className={formStyles.hint} style={{ marginTop: 16 }}>
        Vos corrections ne sont pas visibles par le lecteur : il voit sa version
        et le fait que le projet a été validé, rien d&apos;autre.
      </p>

      <form
        className={formStyles.form}
        action={publishReport}
        style={{ marginTop: 32 }}
      >
        <input type="hidden" name="report_id" value={report.id} />

        <label className={formStyles.field}>
          <span>Lecteur (celui qui sera payé pour cette fiche)</span>
          <select name="reader_id" defaultValue={brouillon?.reader_id ?? report.reader_id}>
            {lecteurs.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nom}
              </option>
            ))}
          </select>
        </label>

        <div className={formStyles.field}>
          <span>Texte publié à l&apos;auteur</span>
          <RichTextEditor fiche surlignerSubjectif name="content" defaultValue={content} />
        </div>

        <label className={formStyles.field}>
          <span>Pourquoi le lecteur labellise ce projet (facultatif)</span>
          <textarea
            name="label_motivation"
            rows={4}
            defaultValue={report.label_motivation ?? ""}
            placeholder="À rédiger à la fin, une fois la fiche terminée."
          />
        </label>

        <label className={formStyles.field}>
          <span>Note publiée (au-delà de 150, le projet est labellisé)</span>
          <ChampNote depart={score} />
        </label>

        {enregistre === "1" && <p className={formStyles.hint}>Enregistré.</p>}
        {enregistre === "0" && <p className={formStyles.hint}>L&apos;enregistrement a échoué : rien n&apos;a été gardé. Réessayez.</p>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          <button type="submit" formAction={enregistrerBrouillon} formNoValidate className={formStyles.submit}>
            Enregistrer
          </button>
          <button type="submit" className={formStyles.submit}>
            {publication ? "Republier" : "Valider et publier"}
          </button>
        </div>
      </form>

      {report.project && (
        <PanneauFilmsAVoir projectId={report.project.id} retour={`/admin/fiches/${report.id}`} />
      )}

    </PageShell>
  );
}
