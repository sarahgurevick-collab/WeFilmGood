import Link from "next/link";
import { BANDEAUX } from "@/components/Bandeau";
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
  selections,
  comediens,
}: {
  filtres: Filtres;
  genres: { slug: string; label_fr: string }[];
  selections: { libelle: string; effectif: number }[];
  comediens: { libelle: string; effectif: number }[];
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
        {/* À la place de la langue (27/09) : les projets signés, tournés
            ou primés, ceux qui portent un bandeau. */}
        <label className={formStyles.field}>
          <span>Signé, tourné ou primé</span>
          <select name="bandeau" defaultValue={filtres.bandeau ?? ""}>
            <option value="">Tous les projets</option>
            <option value="tous">Signés, tournés et primés</option>
            {Object.entries(BANDEAUX).map(([cle, libelle]) => (
              <option key={cle} value={cle}>
                {libelle}
              </option>
            ))}
          </select>
        </label>
        {/* Équipe déjà en place (27/09, libellés validés par Sarah) : un
            producteur intéresse les coproducteurs, un réalisateur les
            comédiens. */}
        <label className={formStyles.field}>
          <span>Équipe déjà en place</span>
          <select name="equipe" defaultValue={filtres.equipe ?? ""}>
            <option value="">Tous les projets</option>
            <option value="producteur">Avec un producteur (coproduction)</option>
            <option value="realisateur">Avec un réalisateur (casting)</option>
          </select>
        </label>
        {/* Les sélections de la Maison des Scénaristes (28/09) : un
            producteur rencontré à Cannes retrouve le projet qui lui a plu. */}
        {selections.length > 0 && (
          <label className={formStyles.field}>
            <span>Sélection de la Maison des Scénaristes</span>
            <select name="selection" defaultValue={filtres.selection ?? ""}>
              <option value="">Toutes</option>
              {selections.map((s) => (
                <option key={s.libelle} value={s.libelle}>
                  {s.libelle} ({s.effectif})
                </option>
              ))}
            </select>
          </label>
        )}
        {/* Les comédiens envisagés par les auteurs : pour les directeurs de
            casting et les comédiens eux-mêmes. */}
        {comediens.length > 0 && (
          <label className={formStyles.field}>
            <span>Comédien·ne envisagé·e</span>
            <select name="comedien" defaultValue={filtres.comedien ?? ""}>
              <option value="">Tous</option>
              {comediens.map((c) => (
                <option key={c.libelle} value={c.libelle}>
                  {c.libelle}
                </option>
              ))}
            </select>
          </label>
        )}

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
