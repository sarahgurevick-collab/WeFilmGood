"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./choix-genre.module.css";
import { POSTURES, TECHNIQUES } from "./formes";

export type SousGenre = { slug: string; label_fr: string; familles: string[] | null };

/** Trois sous-genres au plus par fiche (04/11, Sarah). */
const MAXIMUM = 3;

function proposeDans(s: SousGenre | undefined, famille: string) {
  return !!s && (!s.familles || s.familles.includes(famille));
}

/**
 * Le genre de la fiche en méga-menu (05/11, Sarah, après l'escalier du
 * 04/11) : un clic ouvre un seul grand bloc horizontal avec toutes les
 * familles côte à côte et leurs sous-genres en dessous, puis une bande pour
 * la posture (fiction / documentaire) et la technique. Fermé, il ne montre
 * que les choix faits. Retour à l'escalier : étiquette genres-avant-megamenu.
 */
export default function ChoixGenre({
  genres,
  sousGenres,
  genreInitial,
  sousGenresInitiaux,
  posturesInitiales,
  techniquesInitiales,
}: {
  genres: { slug: string; label_fr: string }[];
  sousGenres: SousGenre[];
  genreInitial: string | null;
  sousGenresInitiaux: string[];
  posturesInitiales: string[];
  techniquesInitiales: string[];
}) {
  const [ouvert, setOuvert] = useState(false);
  const [genre, setGenre] = useState(genreInitial ?? "");
  const [choisis, setChoisis] = useState<string[]>(sousGenresInitiaux);
  const [postures, setPostures] = useState<string[]>(posturesInitiales);
  const [techniques, setTechniques] = useState<string[]>(techniquesInitiales);
  const cadre = useRef<HTMLDivElement>(null);
  const champGenre = useRef<HTMLInputElement>(null);

  const parSlug = new Map(sousGenres.map((s) => [s.slug, s]));
  const proposes = genre ? sousGenres.filter((s) => proposeDans(s, genre)) : [];
  const complet = Boolean(genre) && postures.length > 0 && techniques.length > 0;

  // L'affiche à côté du formulaire écoute les champs : on la prévient du genre choisi.
  useEffect(() => {
    champGenre.current?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [genre]);

  // Fermer d'un clic ailleurs ou avec Échap.
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (cadre.current && !cadre.current.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);

  const choisirGenre = (g: string) => {
    setGenre(g);
    setChoisis((avant) => avant.filter((slug) => proposeDans(parSlug.get(slug), g)));
  };
  const basculerSousGenre = (slug: string) =>
    setChoisis((avant) =>
      avant.includes(slug) ? avant.filter((x) => x !== slug) : avant.length >= MAXIMUM ? avant : [...avant, slug],
    );
  const basculer = (liste: string[], fixer: (l: string[]) => void, v: string) =>
    fixer(liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v]);

  const libelleGenre = genres.find((g) => g.slug === genre)?.label_fr;
  const resume = [
    libelleGenre,
    choisis.map((s) => parSlug.get(s)?.label_fr).filter(Boolean).join(", "),
    POSTURES.filter((p) => postures.includes(p.value)).map((p) => p.label).join(", "),
    TECHNIQUES.filter((t) => techniques.includes(t.value)).map((t) => t.label).join(", "),
  ];

  const caseForme = (value: string, label: string, coche: boolean, onClick: () => void) => (
    <button
      key={value}
      type="button"
      className={`${styles.element} ${coche ? styles.coche : ""}`}
      onClick={onClick}
      aria-pressed={coche}
    >
      <span>{label}</span>
      {coche ? <span aria-hidden="true">✓</span> : null}
    </button>
  );

  return (
    <div className={styles.bloc} ref={cadre}>
      <span className={styles.titre}>Genre principal *</span>

      {/* Ce que le formulaire envoie. */}
      <input ref={champGenre} type="hidden" name="genre_slug" value={genre} />
      {choisis.map((s) => (
        <input key={s} type="hidden" name="sous_genres" value={s} />
      ))}
      {postures.map((p) => (
        <input key={p} type="hidden" name="postures" value={p} />
      ))}
      {techniques.map((t) => (
        <input key={t} type="hidden" name="techniques" value={t} />
      ))}
      {/* L'obligation : vide tant qu'une marche obligatoire manque. */}
      <input
        className={styles.obligation}
        tabIndex={-1}
        aria-hidden="true"
        required
        value={complet ? "1" : ""}
        onChange={() => {}}
        onInvalid={() => setOuvert(true)}
      />

      <button
        type="button"
        className={`${styles.ouvrir} ${ouvert ? styles.ouvrirActif : ""}`}
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
      >
        {libelleGenre ? (
          <span className={styles.resume}>
            {resume.map((r, i) =>
              r ? (
                <span key={i} style={{ "--marche": i } as React.CSSProperties}>
                  {r}
                </span>
              ) : null,
            )}
          </span>
        ) : (
          <span className={styles.vide}>Choisir un genre</span>
        )}
      </button>

      {ouvert && (
        <div className={styles.mega}>
          <button type="button" className={styles.fermer} onClick={() => setOuvert(false)} aria-label="Fermer">
            ×
          </button>
          {/* Toutes les familles côte à côte, leurs sous-genres en dessous. */}
          <div className={styles.familles}>
            {genres.map((g) => {
              const active = g.slug === genre;
              return (
                <div key={g.slug} className={`${styles.colonne} ${active ? styles.colonneActive : ""}`}>
                  <button
                    type="button"
                    className={styles.famille}
                    onClick={() => choisirGenre(g.slug)}
                    aria-pressed={active}
                  >
                    <span>{g.label_fr}</span>
                    {active ? <span aria-hidden="true">✓</span> : null}
                  </button>
                  {sousGenres
                    .filter((s) => proposeDans(s, g.slug))
                    .map((s) => {
                      const coche = active && choisis.includes(s.slug);
                      return (
                        <button
                          key={s.slug}
                          type="button"
                          className={`${styles.element} ${coche ? styles.coche : ""}`}
                          disabled={active && !coche && choisis.length >= MAXIMUM}
                          aria-pressed={coche}
                          onClick={() => {
                            // Un sous-genre d'une autre famille choisit aussi cette famille.
                            if (!active) {
                              choisirGenre(g.slug);
                              setChoisis((avant) => {
                                const gardes = avant.filter((x) => proposeDans(parSlug.get(x), g.slug));
                                return gardes.includes(s.slug) || gardes.length >= MAXIMUM ? gardes : [...gardes, s.slug];
                              });
                            } else basculerSousGenre(s.slug);
                          }}
                        >
                          <span>{s.label_fr}</span>
                          {coche ? <span aria-hidden="true">✓</span> : null}
                        </button>
                      );
                    })}
                </div>
              );
            })}
          </div>
          <div className={styles.formes}>
            <div className={styles.groupeForme}>
              {/* Fiction ou documentaire : l'un ou l'autre (04/11, Sarah). */}
              {POSTURES.map((p) => caseForme(p.value, p.label, postures.includes(p.value), () => setPostures([p.value])))}
            </div>
            <div className={styles.groupeForme}>
              {TECHNIQUES.map((t) =>
                caseForme(t.value, t.label, techniques.includes(t.value), () => basculer(techniques, setTechniques, t.value)),
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
