import ChampAvecCompteur from "@/components/ChampAvecCompteur";
import formStyles from "@/components/form.module.css";
import styles from "./deposer.module.css";

// Un documentaire ou un film d'animation n'est pas un format : selon sa
// durée, c'est un long ou un court métrage. Les quatre valeurs ci-dessous
// sont les seules utilisées, ici comme sur l'ancienne plateforme.
export const FORMATS = [
  { value: "long_metrage", label: "Long métrage" },
  { value: "court_metrage", label: "Court métrage" },
  { value: "serie", label: "Série" },
  { value: "immersif_360_vr", label: "Format immersif (360/VR)" },
];

// Trois tranches seulement (27/09/2026, libellés de Sarah) : les cinq
// tranches de WFG 1 étaient trop fines pour chercher un projet.
export const BUDGETS = [
  { value: "petit", label: "Petits budgets (< 1 M€)" },
  { value: "milieu", label: "Films du milieu" },
  { value: "gros", label: "Gros budgets (> 7 M€)" },
];

// « Public » veut dire deux choses sur le site : ici, c'est celui à qui
// le film s'adresse, jamais la visibilité de la fiche.
// Les audiences (27/09/2026, libellés de Sarah), plus « Tous publics »
// repris de WFG 1.
export const AUDIENCES = [
  { value: "jeune_public", label: "Jeune public (3 à 12 ans)" },
  { value: "jeunes_adultes", label: "Jeunes adultes (15 à 25 ans)" },
  { value: "adultes", label: "Adultes et seniors" },
  { value: "tous_publics", label: "Tous publics" },
];

export type ValeursFiche = {
  title: string;
  tagline: string | null;
  /** vrai tant que la tagline est celle proposée par WeFilmGood (l'auteur ne l'a pas changée) */
  tagline_proposee?: boolean | null;
  logline: string | null;
  synopsis?: string | null;
  format: string | null;
  genre_slug: string | null;
  budget_range: string | null;
  target_audience: string | null;
  has_awards: boolean;
  awards_detail: string | null;
};

/**
 * Les champs du bloc 1, partagés entre la création et la modification.
 * Le formulaire qui les entoure doit porter la classe `formulaire` de
 * deposer.module.css : c'est elle qui n'affiche le détail des prix que
 * sur OUI.
 *
 * Quatre champs portent l'astérisque des éléments essentiels : le titre,
 * le format, le genre principal et la tagline. Sans eux, pas de fiche.
 * Tout le reste peut venir plus tard, mais une fiche mieux remplie est
 * mieux mise en avant par le site.
 */
export default function ChampsFiche({
  valeurs,
  genres,
}: {
  valeurs: ValeursFiche | null;
  genres: { slug: string; label_fr: string }[];
}) {
  return (
    <>
      <label className={formStyles.field}>
        <span>Titre *</span>
        <input type="text" name="title" required defaultValue={valeurs?.title ?? ""} />
      </label>

      {/* Format, genre, budget et audience : une seule décision d'ensemble,
          groupée juste sous le titre plutôt que quatre champs isolés plus
          bas dans le formulaire. Pas de « lieu de l'histoire » : sur WFG 2,
          ce sont les mots-clés générés qui s'en chargent, bien mieux que la
          liste manuelle de WFG 1 (décision de Sarah, 22/09/2026).
          Budget et audience disparaissent pour un court métrage (27/09) :
          il est fait pour les festivals, sans modèle économique. */}
      <div className={styles.groupe}>
        <label className={formStyles.field}>
          <span>Format *</span>
          <select name="format" required defaultValue={valeurs?.format ?? ""}>
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
          <span>Genre principal *</span>
          <select name="genre_slug" required defaultValue={valeurs?.genre_slug ?? ""}>
            <option value="" disabled>
              Choisir un genre
            </option>
            {genres.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.label_fr}
              </option>
            ))}
          </select>
        </label>
        <label className={`${formStyles.field} ${styles.horsCourt}`}>
          <span>Budget estimé</span>
          <select name="budget_range" defaultValue={valeurs?.budget_range ?? ""}>
            <option value="">Non précisé</option>
            {BUDGETS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label className={`${formStyles.field} ${styles.horsCourt}`}>
          <span>Audience ciblée</span>
          <select name="target_audience" defaultValue={valeurs?.target_audience ?? ""}>
            <option value="">Non précisé</option>
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ChampAvecCompteur
        nom="tagline"
        libelle="Tagline"
        indication={
          valeurs?.tagline_proposee
            ? "Proposée par WeFilmGood — vous pouvez la modifier"
            : "Votre phrase d'accroche — une ou deux phrases courtes"
        }
        limite={300}
        lignes={3}
        valeurInitiale={valeurs?.tagline ?? ""}
        requis
      />
      <ChampAvecCompteur
        nom="logline"
        libelle="Logline"
        indication="Un petit résumé de l'histoire, en quelques phrases"
        limite={600}
        lignes={6}
        valeurInitiale={valeurs?.logline ?? ""}
      />
      <ChampAvecCompteur
        nom="synopsis"
        libelle="Plus…"
        indication="Informations supplémentaires sur le projet : lien vers un teaser…"
        limite={1000}
        lignes={4}
        valeurInitiale={valeurs?.synopsis ?? ""}
      />

      <label className={styles.question}>
        <span>Votre projet a-t-il eu des prix ?</span>
        <span className={styles.interrupteur}>
          <input type="checkbox" name="has_awards" value="oui" defaultChecked={valeurs?.has_awards ?? false} />
          <span className={styles.rond} aria-hidden="true" />
        </span>
      </label>
      <label className={`${formStyles.field} ${styles.prix}`}>
        <span>Lesquels ?</span>
        <textarea
          name="awards_detail"
          rows={3}
          placeholder="Festival, année, prix obtenu…"
          defaultValue={valeurs?.awards_detail ?? ""}
        />
      </label>

    </>
  );
}
