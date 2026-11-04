"use client";

import { useState } from "react";
import styles from "./choix-genre.module.css";

export type SousGenre = { slug: string; label_fr: string; familles: string[] | null };

/** Trois sous-genres au plus par fiche (04/11, Sarah). */
const MAXIMUM = 3;

function proposeDans(s: SousGenre | undefined, famille: string) {
  return !!s && (!s.familles || s.familles.includes(famille));
}

/**
 * Le genre de la fiche en tags rouges (04/11, Sarah) : une famille
 * obligatoire, puis jusqu'à trois sous-genres facultatifs. Seuls les
 * sous-genres de la famille choisie sont montrés, plus animation et
 * documentaire, proposés partout. Changer de famille retire les
 * sous-genres qui n'y sont pas.
 */
export default function ChoixGenre({
  genres,
  sousGenres,
  genreInitial,
  sousGenresInitiaux,
}: {
  genres: { slug: string; label_fr: string }[];
  sousGenres: SousGenre[];
  genreInitial: string | null;
  sousGenresInitiaux: string[];
}) {
  const [genre, setGenre] = useState(genreInitial ?? "");
  const [choisis, setChoisis] = useState<string[]>(sousGenresInitiaux);

  const parSlug = new Map(sousGenres.map((s) => [s.slug, s]));
  const proposes = genre ? sousGenres.filter((s) => proposeDans(s, genre)) : [];

  const choisirGenre = (g: string) => {
    setGenre(g);
    setChoisis((avant) => avant.filter((slug) => proposeDans(parSlug.get(slug), g)));
  };

  const basculer = (slug: string) =>
    setChoisis((avant) =>
      avant.includes(slug) ? avant.filter((x) => x !== slug) : avant.length >= MAXIMUM ? avant : [...avant, slug],
    );

  return (
    <div className={styles.bloc}>
      <fieldset className={styles.ligne}>
        <legend>Genre principal *</legend>
        <div className={styles.tags}>
          {genres.map((g) => (
            <label key={g.slug} className={`${styles.tag} ${genre === g.slug ? styles.choisi : ""}`}>
              <input
                type="radio"
                name="genre_slug"
                value={g.slug}
                required
                checked={genre === g.slug}
                onChange={() => choisirGenre(g.slug)}
                className={styles.cache}
              />
              {g.label_fr}
            </label>
          ))}
        </div>
      </fieldset>

      {proposes.length > 0 && (
        <fieldset className={styles.ligne}>
          <legend>Sous-genres (trois au plus)</legend>
          <div className={styles.tags}>
            {proposes.map((s) => {
              const coche = choisis.includes(s.slug);
              const bloque = !coche && choisis.length >= MAXIMUM;
              return (
                <label
                  key={s.slug}
                  className={`${styles.tag} ${styles.sousGenre} ${coche ? styles.choisi : ""} ${bloque ? styles.bloque : ""}`}
                >
                  <input
                    type="checkbox"
                    name="sous_genres"
                    value={s.slug}
                    checked={coche}
                    disabled={bloque}
                    onChange={() => basculer(s.slug)}
                    className={styles.cache}
                  />
                  {s.label_fr}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
    </div>
  );
}
