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

export type ValeursFiche = {
  title: string;
  logline: string | null;
  synopsis: string | null;
  format: string | null;
  genre_slug: string | null;
  has_awards: boolean;
  awards_detail: string | null;
};

/**
 * Les champs du bloc 1, partagés entre la création et la modification.
 * Le formulaire qui les entoure doit porter la classe `formulaire` de
 * deposer.module.css : c'est elle qui n'affiche le détail des prix que
 * sur OUI.
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
        <span>Titre</span>
        <input type="text" name="title" required defaultValue={valeurs?.title ?? ""} />
      </label>
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

      <label className={styles.question}>
        <span>Votre projet a-t-il eu des prix ?</span>
        <span className={styles.interrupteur}>
          <input type="checkbox" name="has_awards" value="oui" defaultChecked={valeurs?.has_awards ?? false} />
          <span className={styles.texte} aria-hidden="true">
            <span className={styles.non}>NON</span>
            <span className={styles.oui}>OUI</span>
          </span>
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
