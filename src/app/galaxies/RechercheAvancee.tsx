"use client";

import { useEffect, useRef } from "react";
import { nombreDeFiltres } from "./filtres";
import { BoutonTag, FAMILLES, familleCachee, tagCache, useFiltres } from "./tags";
import styles from "./projets.module.css";

/**
 * Le bouton « Recherche avancée » de WFG 1, qui se déplie. Depuis le 02/11
 * (choix de Sarah) : plus de menus, des tags — une ligne par famille, une
 * couleur par famille (format bleu, genre rouge, audience jaune, budget
 * vert), un seul tag par famille. Un clic filtre tout de suite : le tag
 * monte dans la barre de recherche, un autre tag de la même couleur le
 * remplace. Ouvert d'office quand un filtre est actif. Les filtres
 * s'ajoutent à la recherche par mot, ils ne la remplacent pas.
 */
export default function RechercheAvancee() {
  const ctx = useFiltres();
  const cadre = useRef<HTMLDetailsElement>(null);
  const actifsAuDepart = ctx ? nombreDeFiltres(ctx.filtres) : 0;
  // Ouvert d'office en arrivant avec un filtre ; ensuite, seul le membre
  // l'ouvre ou le ferme (retirer le dernier tag ne referme pas le cadre).
  useEffect(() => {
    if (actifsAuDepart > 0 && cadre.current) cadre.current.open = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- à l'arrivée seulement
  }, []);
  if (!ctx) return null;
  const { filtres, tags, choisir, effacer } = ctx;
  const actifs = nombreDeFiltres(filtres);

  // Les menus d'avant portaient ces noms : ils restent pour les lecteurs d'écran.
  const NOM: Record<string, string> = {
    format: "Format du projet",
    genre: "Genre principal",
    audience: "Audience ciblée",
    budget: "Budget estimé",
  };

  return (
    <details ref={cadre} className={styles.avancee}>
      {/* Fermé : le bouton rouge. Ouvert : le même texte posé sur le bord
          du cadre, avec la croix × pour refermer (28/09 : le rond ⊖ se lisait comme un « moins »). */}
      <summary className={styles.avanceeBouton}>
        Recherche avancée
        {actifs > 0 && <span className={styles.avanceePastille}>{actifs}</span>}
        <span className={styles.avanceeFermer} aria-hidden="true">×</span>
      </summary>

      <div className={styles.avanceeTags}>
        {FAMILLES.map((famille) => {
          if (familleCachee(famille, filtres)) return null;
          // Le tag choisi est monté dans la barre de recherche : il quitte sa ligne.
          const ligne = tags.filter(
            (t) => t.famille === famille && filtres[famille] !== t.valeur && !tagCache(t, filtres),
          );
          if (ligne.length === 0) return null;
          return (
            <div key={famille} className={styles.ligneTags} role="group" aria-label={NOM[famille]}>
              {ligne.map((t) => (
                <BoutonTag key={t.valeur} tag={t} choisi={false} onClick={() => choisir(famille, t.valeur)} />
              ))}
            </div>
          );
        })}

        {/* Retirés du panneau le 30/09 (décision de Sarah) : « Signé, tourné
            ou primé », « Équipe déjà en place », « Sélection de la Maison des
            Scénaristes » et « Comédien·ne envisagé·e ». Les filtres existent
            toujours dans l'adresse (?bandeau=…), pour un futur emplacement. */}

        {actifs > 0 && (
          <div className={styles.avanceeActions}>
            <button
              type="button"
              className={styles.toutEffacer}
              onClick={effacer}
            >
              Tout effacer
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
