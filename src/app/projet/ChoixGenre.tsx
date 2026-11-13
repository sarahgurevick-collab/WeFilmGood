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
 * Le genre de la fiche en quatre étapes : la famille, ses sous-genres, la
 * posture (fiction / documentaire), la technique. Fermé, il ne montre que
 * les choix faits.
 *
 * Essai du 13/11/2026 (Sarah, d'après « Animated file tree » de 21st.dev) :
 * ouvert, c'est une arborescence qui se déplie. La famille choisie s'ouvre
 * comme un dossier sur ses sous-genres ; dessous viennent Fiction et
 * Documentaire, et la posture choisie s'ouvre à son tour sur les techniques.
 * Mêmes règles et mêmes étapes que l'escalier à quatre marches rouges
 * d'avant (04/11 – 13/11) : étiquette git fiche-avant-arborescence.
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
  // Les marches s'ouvrent une après l'autre (05/11, Sarah) : la dernière
  // marche ouverte (0 à 3). Une fiche déjà remplie les montre toutes.
  const [atteinte, setAtteinte] = useState(() =>
    !genreInitial ? 0 : posturesInitiales.length ? 3 : sousGenresInitiaux.length ? 2 : 1,
  );
  const avancer = (n: number) => setAtteinte((a) => Math.max(a, n));
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
    avancer(1);
    setChoisis((avant) => avant.filter((slug) => proposeDans(parSlug.get(slug), g)));
  };
  const basculerSousGenre = (slug: string) => {
    avancer(2);
    setChoisis((avant) =>
      avant.includes(slug) ? avant.filter((x) => x !== slug) : avant.length >= MAXIMUM ? avant : [...avant, slug],
    );
  };
  const basculer = (liste: string[], fixer: (l: string[]) => void, v: string) =>
    fixer(liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v]);

  const libelleGenre = genres.find((g) => g.slug === genre)?.label_fr;
  const resume = [
    libelleGenre,
    choisis.map((s) => parSlug.get(s)?.label_fr).filter(Boolean).join(", "),
    POSTURES.filter((p) => postures.includes(p.value)).map((p) => p.label).join(", "),
    TECHNIQUES.filter((t) => techniques.includes(t.value)).map((t) => t.label).join(", "),
  ];

  // Une ligne de l'arborescence : un « dossier » (chevron, il s'ouvre) ou une
  // « feuille » (case à cocher).
  const ligne = (e: {
    cle: string;
    rang: number;
    label: string;
    coche: boolean;
    dossier?: boolean;
    bloque?: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      className={`${styles.ligne} ${e.coche ? styles.coche : ""}`}
      style={{ "--rang": e.rang } as React.CSSProperties}
      onClick={e.onClick}
      disabled={e.bloque}
      aria-pressed={e.coche}
      aria-expanded={e.dossier ? e.coche : undefined}
    >
      {e.dossier ? (
        <span className={styles.chevron} aria-hidden="true">
          ›
        </span>
      ) : (
        <span className={styles.caseACocher} aria-hidden="true">
          {e.coche ? "✓" : ""}
        </span>
      )}
      <span>{e.label}</span>
    </button>
  );

  return (
    <div className={styles.bloc} ref={cadre} data-visite="genre">
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
        <div className={styles.arbre}>
          <button type="button" className={styles.fermer} onClick={() => setOuvert(false)} aria-label="Fermer">
            ×
          </button>
          <ul className={styles.niveau}>
            {genres.map((g, i) => (
              <li key={g.slug}>
                {ligne({
                  cle: g.slug,
                  rang: i,
                  label: g.label_fr,
                  coche: g.slug === genre,
                  dossier: true,
                  onClick: () => choisirGenre(g.slug),
                })}
                {g.slug === genre && atteinte >= 1 && (
                  <ul className={`${styles.niveau} ${styles.branche}`}>
                    {proposes.map((sg, j) => {
                      const coche = choisis.includes(sg.slug);
                      return (
                        <li key={sg.slug}>
                          {ligne({
                            cle: sg.slug,
                            rang: j,
                            label: sg.label_fr,
                            coche,
                            bloque: !coche && choisis.length >= MAXIMUM,
                            onClick: () => basculerSousGenre(sg.slug),
                          })}
                        </li>
                      );
                    })}
                    {/* Les sous-genres sont facultatifs : de quoi passer à la suite. */}
                    {atteinte < 2 && (
                      <li>
                        <button
                          type="button"
                          className={`${styles.ligne} ${styles.suivant}`}
                          style={{ "--rang": proposes.length } as React.CSSProperties}
                          onClick={() => avancer(2)}
                        >
                          <span className={styles.chevron} aria-hidden="true">
                            ›
                          </span>
                          <span>Suivant</span>
                        </button>
                      </li>
                    )}
                    {atteinte >= 2 &&
                      POSTURES.map((p, j) => (
                        <li key={p.value} className={j === 0 ? styles.separe : undefined}>
                          {ligne({
                            cle: p.value,
                            rang: j,
                            label: p.label,
                            coche: postures.includes(p.value),
                            dossier: true,
                            // Fiction ou documentaire : l'un ou l'autre (04/11, Sarah).
                            onClick: () => {
                              setPostures([p.value]);
                              avancer(3);
                            },
                          })}
                          {postures.includes(p.value) && atteinte >= 3 && (
                            <ul className={`${styles.niveau} ${styles.branche}`}>
                              {TECHNIQUES.map((t, k) => (
                                <li key={t.value}>
                                  {ligne({
                                    cle: t.value,
                                    rang: k,
                                    label: t.label,
                                    coche: techniques.includes(t.value),
                                    // La dernière branche cochée, l'arborescence se referme
                                    // d'elle-même (07/11, Sarah), le temps de voir la coche.
                                    // Décocher la laisse ouverte ; une seconde technique :
                                    // un clic la rouvre.
                                    onClick: () => {
                                      const ajout = !techniques.includes(t.value);
                                      basculer(techniques, setTechniques, t.value);
                                      if (ajout && genre && postures.length) setTimeout(() => setOuvert(false), 350);
                                    },
                                  })}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
