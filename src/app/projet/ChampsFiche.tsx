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

export const BUDGETS = [
  { value: "moins_1m", label: "< 1 million €" },
  { value: "1_3m", label: "1 à 3 millions €" },
  { value: "3_5m", label: "3 à 5 millions €" },
  { value: "5_10m", label: "5 à 10 millions €" },
  { value: "plus_10m", label: "> 10 millions €" },
];

// « Public » veut dire deux choses sur le site : ici, c'est celui à qui
// le film s'adresse, jamais la visibilité de la fiche.
export const AUDIENCES = [
  { value: "tous_publics", label: "Tous publics" },
  { value: "jeune_public", label: "Jeune public" },
  { value: "adultes", label: "Adultes" },
  { value: "interdit_12", label: "Interdit aux moins de 12 ans" },
  { value: "interdit_16", label: "Interdit aux moins de 16 ans" },
  { value: "interdit_18", label: "Interdit aux moins de 18 ans" },
];

export type ValeursFiche = {
  title: string;
  logline: string | null;
  synopsis: string | null;
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
 * Seul le titre est marqué d'un astérisque : c'est le seul champ que la
 * création exige. Tout le reste peut venir plus tard, mais une fiche
 * mieux remplie est mieux mise en avant par le site.
 */
export default function ChampsFiche({
  valeurs,
  genres,
  scenarioActuel,
}: {
  valeurs: ValeursFiche | null;
  genres: { slug: string; label_fr: string }[];
  /** Nom du scénario déjà déposé, s'il y en a un. */
  scenarioActuel?: string | null;
}) {
  return (
    <>
      <label className={formStyles.field}>
        <span>Titre *</span>
        <input type="text" name="title" required defaultValue={valeurs?.title ?? ""} />
      </label>

      {/* Format, genre, budget et audience : une seule décision d'ensemble,
          groupée juste sous le titre plutôt que quatre champs isolés plus
          bas dans le formulaire. */}
      <div className={styles.groupe}>
        <label className={formStyles.field}>
          <span>Format</span>
          <select name="format" defaultValue={valeurs?.format ?? ""}>
            <option value="" disabled={!valeurs}>
              {valeurs ? "Non précisé" : "Choisir un format"}
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
          <select name="genre_slug" defaultValue={valeurs?.genre_slug ?? ""}>
            <option value="" disabled={!valeurs}>
              {valeurs ? "Non précisé" : "Choisir un genre"}
            </option>
            {genres.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.label_fr}
              </option>
            ))}
          </select>
        </label>
        <label className={formStyles.field}>
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
        <label className={formStyles.field}>
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
        nom="logline"
        libelle="Tagline"
        indication="Votre phrase d'accroche — une ou deux phrases courtes"
        limite={300}
        lignes={3}
        valeurInitiale={valeurs?.logline ?? ""}
      />
      <ChampAvecCompteur
        nom="synopsis"
        libelle="Logline"
        indication="Un petit résumé de l'histoire, en quelques phrases"
        limite={600}
        lignes={6}
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

      <label className={formStyles.field}>
        <span>{scenarioActuel ? "Remplacer le scénario (PDF)" : "Scénario (PDF)"}</span>
        <input type="file" name="scenario" accept="application/pdf" />
        <span className={formStyles.hint}>
          {scenarioActuel && (
            <>
              Fichier actuel : <strong>{scenarioActuel}</strong>. Laissez vide pour le conserver.{" "}
            </>
          )}
          Confidentiel : seuls vous, les lecteurs qui en seront chargés et l&apos;administration y
          auront accès.
        </span>
      </label>
    </>
  );
}
