import Link from "next/link";
import formStyles from "@/components/form.module.css";
import profilStyles from "@/app/profil/profil.module.css";
import BlocProjet from "../../BlocProjet";
import ChampsFiche from "../../ChampsFiche";
import { chargerProjetAModifier } from "../../blocs";
import styles from "../../deposer.module.css";
import { modifierProjet } from "./actions";

/** Bloc 1 d'une fiche existante : titre, tagline, logline, format, genre, budget, audience, prix. */
export default async function ModifierProjetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;
  const { supabase, projet } = await chargerProjetAModifier(id, "fiche");

  const { data: genres } = await supabase.from("genres").select("slug, label_fr").order("position");
  const { data: sousGenres } = await supabase.from("sous_genres").select("slug, label_fr, familles").order("position");
  const { data: sesSousGenres } = await supabase
    .from("project_sous_genres")
    .select("sous_genre_slug")
    .eq("project_id", id)
    .order("position");
  // Les mots-clés choisis par l'auteur (07/11), y compris ceux demandés sur WFG 1.
  const { data: sesMots } = await supabase
    .from("project_keywords")
    .select("keyword:keywords(label_fr)")
    .eq("project_id", id)
    .eq("source", "demande_auteur")
    .returns<{ keyword: { label_fr: string } | null }[]>();
  const { data: nuages } = await supabase.rpc("nuages_mots_cles_fiche");
  const { data: selections } = await supabase
    .from("project_selections")
    .select("libelle")
    .eq("project_id", id)
    .order("libelle");

  return (
    <BlocProjet actif="fiche" projet={projet}>

      <form
        className={`${formStyles.form} ${styles.formulaire}`}
        action={modifierProjet}
        encType="multipart/form-data"
        style={{ marginTop: 24 }}
      >
        <input type="hidden" name="project_id" value={projet.id} />
        {erreur && <p className={formStyles.error}>{erreur}</p>}

        <ChampsFiche
          valeurs={{
            ...projet,
            sous_genres: (sesSousGenres ?? []).map((s) => s.sous_genre_slug),
            mots_cles_auteur: (sesMots ?? []).map((m) => m.keyword?.label_fr).filter((m): m is string => Boolean(m)),
          }}
          genres={genres ?? []}
          sousGenres={sousGenres ?? []}
          selections={(selections ?? []).map((s) => s.libelle)}
          nuages={nuages ?? {}} />

        <div className={profilStyles.pied}>
          {/* Rien n'est enregistré sans le bouton : la flèche ramène à « Mes projets » (01/10). */}
          <Link href={`/mes-projets?projet=${id}`} className={profilStyles.lienDiscret}>
            ← Annuler
          </Link>
          <button type="submit" className={formStyles.submit}>
            Enregistrer
          </button>
        </div>
      </form>
    </BlocProjet>
  );
}
