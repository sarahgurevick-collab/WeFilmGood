import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "./actions";

const FORMATS = [
  { value: "long_metrage", label: "Long métrage" },
  { value: "court_metrage", label: "Court métrage" },
  { value: "serie", label: "Série" },
  { value: "documentaire", label: "Documentaire" },
  { value: "animation", label: "Animation" },
  { value: "immersif_360_vr", label: "Format immersif (360/VR)" },
];

export default async function DeposerPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?next=/deposer");
  }

  const { data: genres } = await supabase
    .from("genres")
    .select("slug, label_fr")
    .order("position", { ascending: true });

  return (
    <PageShell eyebrow="Dépôt de projet" title="Déposez votre projet">
      <form className={formStyles.form} action={createProject} encType="multipart/form-data">
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <label className={formStyles.field}>
          <span>Titre</span>
          <input type="text" name="title" required />
        </label>
        <label className={formStyles.field}>
          <span>Logline</span>
          <input type="text" name="logline" placeholder="Une phrase pour résumer l'histoire" />
        </label>
        <label className={formStyles.field}>
          <span>Synopsis</span>
          <textarea name="synopsis" rows={6} />
        </label>
        <label className={formStyles.field}>
          <span>Format</span>
          <select name="format" defaultValue="">
            <option value="" disabled>
              Choisir un format
            </option>
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className={formStyles.field}>
          <span>Genre principal</span>
          <select name="genre_slug" defaultValue="">
            <option value="" disabled>
              Choisir un genre
            </option>
            {(genres ?? []).map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.label_fr}
              </option>
            ))}
          </select>
        </label>
        <label className={formStyles.field}>
          <span>Scénario (PDF)</span>
          <input type="file" name="scenario" accept="application/pdf" />
        </label>

        <button type="submit" className={formStyles.submit}>
          Envoyer
        </button>
      </form>
    </PageShell>
  );
}
