import Link from "next/link";
import formStyles from "@/components/form.module.css";
import { AUDIENCES, BUDGETS, FORMATS } from "@/app/projet/ChampsFiche";
import { adresse, nombreDeFiltres, type Filtres } from "./filtres";
import styles from "./projets.module.css";

/**
 * Le bouton « Recherche avancée » de WFG 1, qui se déplie : quatre menus,
 * un bouton Filtrer. Pas de JavaScript — un simple formulaire, ouvert
 * d'office quand un filtre est actif. Les filtres s'ajoutent à la
 * recherche par mot, ils ne la remplacent pas.
 */
export default function RechercheAvancee({
  filtres,
  genres,
}: {
  filtres: Filtres;
  genres: { slug: string; label_fr: string }[];
}) {
  const actifs = nombreDeFiltres(filtres);

  return (
    <details className={styles.avancee} open={actifs > 0}>
      {/* Fermé : le bouton rouge. Ouvert : le même texte posé sur le bord
          du cadre, avec la croix × pour refermer (28/09 : le rond ⊖ se lisait comme un « moins »). */}
      <summary className={styles.avanceeBouton}>
        Recherche avancée
        {actifs > 0 && <span className={styles.avanceePastille}>{actifs}</span>}
        <span className={styles.avanceeFermer} aria-hidden="true">×</span>
      </summary>

      {/* La clé force les menus à se remettre à leur valeur quand les
          filtres changent : sans elle, « Tout effacer » vidait le compteur
          mais laissait « Court métrage » sélectionné (30/09). */}
      <form key={adresse(filtres)} method="get" action="/pitchotheque" className={styles.avanceePanneau}>
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
        {/* Retirés du panneau le 30/09 (décision de Sarah) : « Signé, tourné
            ou primé », « Équipe déjà en place », « Sélection de la Maison des
            Scénaristes » et « Comédien·ne envisagé·e ». Seul ce qui touche
            directement au projet reste. Les filtres existent toujours dans
            l'adresse (?bandeau=…), pour un futur emplacement. */}

        <div className={styles.avanceeActions}>
          {actifs > 0 && (
            <Link href={adresse({ format: null, genre: null, audience: null, budget: null, bandeau: null, equipe: null, selection: null, comedien: null })}>
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
