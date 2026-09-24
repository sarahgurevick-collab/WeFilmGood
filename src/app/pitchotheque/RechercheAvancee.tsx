import Link from "next/link";
import formStyles from "@/components/form.module.css";
import { AUDIENCES, BUDGETS, FORMATS } from "@/app/projet/ChampsFiche";
import { adresse, nombreDeFiltres, type Filtres } from "./filtres";
import styles from "./projets.module.css";

/**
 * Le bouton « Recherche avancée » de WFG 1, qui se déplie : cinq menus,
 * un bouton Filtrer. Pas de JavaScript — un simple formulaire, ouvert
 * d'office quand un filtre est actif. Les filtres s'ajoutent à la
 * recherche par mot, ils ne la remplacent pas.
 */
export default function RechercheAvancee({
  filtres,
  genres,
  langues,
}: {
  filtres: Filtres;
  genres: { slug: string; label_fr: string }[];
  langues: { code: string; label_fr: string }[];
}) {
  const actifs = nombreDeFiltres(filtres);

  return (
    <details className={styles.avancee} open={actifs > 0}>
      {/* Fermé : le bouton rouge. Ouvert : le même texte posé sur le bord
          du cadre, avec le rond ⊖ pour refermer — comme sur WFG 1. */}
      <summary className={styles.avanceeBouton}>
        Recherche avancée
        {actifs > 0 && <span className={styles.avanceePastille}>{actifs}</span>}
        <span className={styles.avanceeFermer} aria-hidden="true">⊖</span>
      </summary>

      <form method="get" action="/pitchotheque" className={styles.avanceePanneau}>
        <label className={formStyles.field}>
          <span>Format du projet</span>
          <select name="format" defaultValue={filtres.format ?? ""}>
            <option value="">Tous les formats</option>
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className={formStyles.field}>
          <span>Genre principal</span>
          <select name="genre" defaultValue={filtres.genre ?? ""}>
            <option value="">Tous les genres</option>
            {genres.map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.label_fr}
              </option>
            ))}
          </select>
        </label>
        <label className={formStyles.field}>
          <span>Audience ciblée</span>
          <select name="audience" defaultValue={filtres.audience ?? ""}>
            <option value="">Toutes les audiences</option>
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className={formStyles.field}>
          <span>Budget estimé</span>
          <select name="budget" defaultValue={filtres.budget ?? ""}>
            <option value="">Tous les budgets</option>
            {BUDGETS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <label className={formStyles.field}>
          <span>Langue du projet</span>
          <select name="langue" defaultValue={filtres.langue ?? ""}>
            <option value="">Toutes les langues</option>
            {langues.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label_fr}
              </option>
            ))}
          </select>
        </label>

        <div className={styles.avanceeActions}>
          {actifs > 0 && (
            <Link href={adresse({ format: null, genre: null, audience: null, budget: null, langue: null })}>
              Tout effacer
            </Link>
          )}
          <button type="submit" className={formStyles.submit}>
            Filtrer
          </button>
        </div>
      </form>
    </details>
  );
}
