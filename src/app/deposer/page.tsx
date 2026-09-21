import { redirect } from "next/navigation";
import ChampAvecCompteur from "@/components/ChampAvecCompteur";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { createProject } from "./actions";

// Un documentaire ou un film d'animation n'est pas un format : selon sa
// durée, c'est un long ou un court métrage. Les quatre valeurs ci-dessous
// sont les seules utilisées, ici comme sur l'ancienne plateforme.
const FORMATS = [
  { value: "long_metrage", label: "Long métrage" },
  { value: "court_metrage", label: "Court métrage" },
  { value: "serie", label: "Série" },
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
    <PageShell eyebrow="Dépôt de projet" title="Déposez votre projet" nav="deposer" connecte>
      <form className={formStyles.form} action={createProject} encType="multipart/form-data">
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <label className={formStyles.field}>
          <span>Titre</span>
          <input type="text" name="title" required />
        </label>
        <ChampAvecCompteur
          nom="logline"
          libelle="Tagline"
          indication="Votre phrase d'accroche — une ou deux phrases courtes"
          limite={300}
          lignes={3}
        />
        <ChampAvecCompteur
          nom="synopsis"
          libelle="Logline"
          indication="Un petit résumé de l'histoire, en quelques phrases"
          limite={600}
          lignes={6}
        />
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
          <span className={formStyles.hint}>
            Confidentiel : seuls vous, le lecteur qui en sera chargé et
            l&apos;administration y auront accès.
          </span>
        </label>

        <label className={formStyles.field}>
          <span>Vignette de présentation (JPG ou PNG, format 16/9)</span>
          <input type="file" name="vignette" accept="image/jpeg,image/png" />
          <span className={formStyles.hint}>
            C&apos;est l&apos;image qui représentera votre projet dans la
            pitchothèque. N&apos;y faites figurer ni votre nom ni le titre.
          </span>
        </label>

        <button type="submit" className={formStyles.submit}>
          Envoyer
        </button>
      </form>
    </PageShell>
  );
}
