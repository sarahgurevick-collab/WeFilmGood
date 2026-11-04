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
 * Le genre de la fiche en quatre marches, comme l'escalier du logo (04/11,
 * Sarah, d'après un menu en cascade) : la famille, ses sous-genres, la
 * posture (fiction / documentaire), la technique. Fermé, il ne montre que
 * les choix faits ; un clic ouvre l'escalier, chaque marche un cran plus
 * bas et plus à droite que la précédente.
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

  const marche = (
    n: number,
    elements: { value: string; label: string; coche: boolean; bloque?: boolean; onClick: () => void; suite?: boolean }[],
  ) => (
    <div className={styles.marche} style={{ "--marche": n } as React.CSSProperties}>
      {elements.map((e) => (
        <button
          key={e.value}
          type="button"
          className={`${styles.element} ${e.coche ? styles.coche : ""}`}
          onClick={e.onClick}
          disabled={e.bloque}
          aria-pressed={e.coche}
        >
          <span>{e.label}</span>
          {e.suite ? <span aria-hidden="true">›</span> : e.coche ? <span aria-hidden="true">✓</span> : null}
        </button>
      ))}
    </div>
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
        <div className={styles.escalier}>
          <button type="button" className={styles.fermer} onClick={() => setOuvert(false)} aria-label="Fermer">
            ×
          </button>
          {marche(
            0,
            genres.map((g) => ({
              value: g.slug,
              label: g.label_fr,
              coche: g.slug === genre,
              suite: g.slug === genre,
              onClick: () => choisirGenre(g.slug),
            })),
          )}
          {genre &&
            marche(
              1,
              proposes.map((s) => {
                const coche = choisis.includes(s.slug);
                return {
                  value: s.slug,
                  label: s.label_fr,
                  coche,
                  bloque: !coche && choisis.length >= MAXIMUM,
                  onClick: () => basculerSousGenre(s.slug),
                };
              }),
            )}
          {genre &&
            marche(
              2,
              POSTURES.map((p) => ({
                value: p.value,
                label: p.label,
                coche: postures.includes(p.value),
                // Fiction ou documentaire : l'un ou l'autre (04/11, Sarah).
                onClick: () => setPostures([p.value]),
              })),
            )}
          {genre &&
            marche(
              3,
              TECHNIQUES.map((t) => ({
                value: t.value,
                label: t.label,
                coche: techniques.includes(t.value),
                onClick: () => basculer(techniques, setTechniques, t.value),
              })),
            )}
        </div>
      )}
    </div>
  );
}
