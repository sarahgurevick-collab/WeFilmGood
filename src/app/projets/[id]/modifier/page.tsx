import { notFound, redirect } from "next/navigation";
import ChampAvecCompteur from "@/components/ChampAvecCompteur";
import PageShell from "@/components/PageShell";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/server";
import { modifierProjet } from "./actions";

// Un documentaire ou un film d'animation n'est pas un format : selon sa
// durée, c'est un long ou un court métrage. Les quatre valeurs ci-dessous
// sont les seules utilisées, ici comme sur l'ancienne plateforme.
const FORMATS = [
  { value: "long_metrage", label: "Long métrage" },
  { value: "court_metrage", label: "Court métrage" },
  { value: "serie", label: "Série" },
  { value: "immersif_360_vr", label: "Format immersif (360/VR)" },
];

type Projet = {
  id: string;
  owner_id: string;
  title: string;
  logline: string | null;
  synopsis: string | null;
  format: string | null;
  genre_slug: string | null;
};

export default async function ModifierProjetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?next=/projets/${id}/modifier`);

  const [{ data: projet }, { data: genres }, { data: admin }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, owner_id, title, logline, synopsis, format, genre_slug")
      .eq("id", id)
      .maybeSingle<Projet>(),
    supabase.from("genres").select("slug, label_fr").order("position"),
    supabase.rpc("is_admin"),
  ]);

  if (!projet) notFound();

  // La base refuserait l'écriture de toute façon ; on évite surtout
  // d'afficher un formulaire qui ne servirait à rien.
  const peutModifier = projet.owner_id === user.id || admin === true;
  if (!peutModifier) redirect(`/projets/${id}`);

  const pourAutrui = admin === true && projet.owner_id !== user.id;

  return (
    <PageShell eyebrow="Projet" title={`Modifier « ${projet.title} »`}>
      {pourAutrui && (
        <p className={formStyles.avertissement}>
          Vous modifiez la fiche d&apos;un autre membre, en tant
          qu&apos;administratrice.
        </p>
      )}

      <form className={formStyles.form} action={modifierProjet} encType="multipart/form-data">
        <input type="hidden" name="project_id" value={projet.id} />
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <label className={formStyles.field}>
          <span>Titre</span>
          <input type="text" name="title" required defaultValue={projet.title} />
        </label>

        <ChampAvecCompteur
          nom="logline"
          libelle="Tagline"
          indication="Votre phrase d'accroche — une ou deux phrases courtes"
          limite={300}
          lignes={3}
          valeurInitiale={projet.logline ?? ""}
        />
        <ChampAvecCompteur
          nom="synopsis"
          libelle="Logline"
          indication="Un petit résumé de l'histoire, en quelques phrases"
          limite={600}
          lignes={6}
          valeurInitiale={projet.synopsis ?? ""}
        />

        <label className={formStyles.field}>
          <span>Format</span>
          <select name="format" defaultValue={projet.format ?? ""}>
            <option value="">Non précisé</option>
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <label className={formStyles.field}>
          <span>Genre principal</span>
          <select name="genre_slug" defaultValue={projet.genre_slug ?? ""}>
            <option value="">Non précisé</option>
            {(genres ?? []).map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.label_fr}
              </option>
            ))}
          </select>
        </label>

        <label className={formStyles.field}>
          <span>Remplacer la vignette (JPG ou PNG, format 16/9)</span>
          <input type="file" name="vignette" accept="image/jpeg,image/png" />
          <span className={formStyles.hint}>
            Laissez vide pour conserver l&apos;image actuelle. Inutile de la
            compresser : nous nous en chargeons.
          </span>
        </label>

        <label className={formStyles.field}>
          <span>Remplacer le scénario (PDF)</span>
          <input type="file" name="scenario" accept="application/pdf" />
          <span className={formStyles.hint}>
            Laissez vide pour conserver le fichier actuel. Confidentiel : seuls
            vous, le lecteur chargé de votre projet et l&apos;administration y
            ont accès.
          </span>
        </label>

        <button type="submit" className={formStyles.submit}>
          Enregistrer
        </button>
      </form>
    </PageShell>
  );
}
