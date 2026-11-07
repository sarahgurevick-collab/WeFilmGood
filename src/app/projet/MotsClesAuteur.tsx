"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import formStyles from "@/components/form.module.css";
import { createClient } from "@/lib/supabase/client";
import styles from "./mots-cles-auteur.module.css";

/** Dix mots au plus par ligne (07/11/2026, Sarah : « Limite à 10 par catégorie »). */
export const MAXIMUM_MOTS_AUTEUR = 10;
/** Combien de mots chaque nuage montre d'abord, puis à chaque « + ». */
const PAR_PALIER = 40;

type CleNuage = "styles" | "sujets" | "univers";
type Cle = CleNuage | "libres";
/** Les trois nuages lus en base (fonction nuages_mots_cles_fiche) : [mot, nombre de fiches sur WFG 1]. */
export type Nuages = Partial<Record<CleNuage, [string, number][]>>;

/** Les titres des lignes (07/11/2026, Sarah). */
const LIGNES: { cle: CleNuage; titre: string }[] = [
  { cle: "styles", titre: "Sous-genres & styles" },
  { cle: "sujets", titre: "Sujets & personnages" },
  { cle: "univers", titre: "Univers & Lieux" },
];

const cleDe = (mot: string) =>
  mot
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/**
 * Les mots-clés choisis par l'auteur, sous la logline (07/11/2026, Sarah).
 * Trois nuages repris de WFG 1 (table nuages_mots_cles) : un clic choisit un
 * mot, un second clic le retire ; dix au plus par ligne. En dessous, un
 * champ pour d'autres mots, qui ne propose QUE des mots existants (Sarah :
 * « le site se nourrit des mots clés des nouvelles fiches ») : les mots des
 * nuages et ceux que l'IA a posés sur des fiches. Aucun mot nouveau, donc
 * aucune faute, contrairement à la demande de mots-clés de WFG 1. Un mot
 * suggéré qui est dans un nuage y est coché. Le formulaire envoie un champ
 * caché par mot ; la base ignore tout mot inconnu.
 */
export default function MotsClesAuteur({ initiaux, nuages }: { initiaux: string[]; nuages: Nuages }) {
  // Où se trouve chaque mot des nuages, pour ranger les mots choisis.
  const ligneDe = useMemo(() => {
    const m = new Map<string, { cle: CleNuage; mot: string }>();
    for (const { cle } of LIGNES) for (const [mot] of nuages[cle] ?? []) m.set(cleDe(mot), { cle, mot });
    return m;
  }, [nuages]);

  const [choisis, setChoisis] = useState<Record<Cle, string[]>>(() => {
    const depart: Record<Cle, string[]> = { styles: [], sujets: [], univers: [], libres: [] };
    for (const brut of initiaux) {
      const trouve = ligneDe.get(cleDe(brut));
      const cle: Cle = trouve ? trouve.cle : "libres";
      if (depart[cle].length < MAXIMUM_MOTS_AUTEUR) depart[cle].push(trouve ? trouve.mot : brut);
    }
    return depart;
  });
  const [paliers, setPaliers] = useState<Record<CleNuage, number>>({ styles: 1, sujets: 1, univers: 1 });
  const [saisie, setSaisie] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tous = [...choisis.styles, ...choisis.sujets, ...choisis.univers, ...choisis.libres];
  const dejaChoisi = (mot: string) => tous.some((x) => cleDe(x) === cleDe(mot));

  // Les suggestions pendant la frappe, à partir de deux lettres.
  useEffect(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    const q = saisie.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    let annule = false;
    minuteur.current = setTimeout(async () => {
      const { data } = await createClient().rpc("suggerer_mots_cles", { q, p_limite: 8 });
      if (!annule) setSuggestions(((data ?? []) as { label: string }[]).map((d) => d.label));
    }, 200);
    return () => {
      annule = true;
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [saisie]);

  const basculer = (cle: Cle, mot: string) =>
    setChoisis((avant) => {
      const liste = avant[cle];
      if (liste.includes(mot)) return { ...avant, [cle]: liste.filter((x) => x !== mot) };
      if (liste.length >= MAXIMUM_MOTS_AUTEUR) return avant;
      return { ...avant, [cle]: [...liste, mot] };
    });

  /** Un mot suggéré : coché dans son nuage s'il y est, sinon ajouté aux autres mots. */
  const prendre = (suggere: string) => {
    const trouve = ligneDe.get(cleDe(suggere));
    if (!dejaChoisi(suggere)) basculer(trouve ? trouve.cle : "libres", trouve ? trouve.mot : suggere);
    setSaisie("");
    setSuggestions([]);
  };

  const proposees = suggestions.filter((s) => !dejaChoisi(s));

  return (
    <div className={formStyles.field}>
      <span id="mots-cles-auteur-libelle">
        Optimisez la recherche avec des mots-clés adaptés à votre projet pour booster sa visibilité.
      </span>
      {tous.map((m) => (
        <input key={m} type="hidden" name="mots_cles_auteur" value={m} />
      ))}

      {LIGNES.map(({ cle, titre }) => {
        const mots = nuages[cle] ?? [];
        const liste = choisis[cle];
        const plein = liste.length >= MAXIMUM_MOTS_AUTEUR;
        const visibles = mots.slice(0, paliers[cle] * PAR_PALIER);
        // Un mot choisi reste visible même s'il est loin dans le nuage.
        const caches = liste.filter((m) => !visibles.some(([v]) => v === m));
        const max = Math.log(1 + (mots[0]?.[1] ?? 1));
        const taille = (n: number) => 13 + Math.round((9 * Math.log(1 + n)) / max);
        return (
          <section key={cle} className={styles.ligne} aria-label={titre}>
            <p className={styles.titreLigne}>
              <span>{titre}</span>
              <span className={plein ? styles.plein : undefined}>
                {liste.length}/{MAXIMUM_MOTS_AUTEUR}
              </span>
            </p>
            <div className={styles.nuage}>
              {[...caches.map((m) => [m, 0] as [string, number]), ...visibles].map(([mot, n]) => {
                const coche = liste.includes(mot);
                return (
                  <button
                    key={mot}
                    type="button"
                    className={`${styles.motNuage} ${coche ? styles.coche : ""}`}
                    style={{ fontSize: taille(n) }}
                    aria-pressed={coche}
                    disabled={!coche && plein}
                    onClick={() => basculer(cle, mot)}
                  >
                    {mot}
                  </button>
                );
              })}
              {visibles.length < mots.length && (
                <button
                  type="button"
                  className={styles.plus}
                  aria-label="Plus de mots"
                  onClick={() => setPaliers((p) => ({ ...p, [cle]: p[cle] + 1 }))}
                >
                  +
                </button>
              )}
              {paliers[cle] > 1 && (
                <button
                  type="button"
                  className={styles.plus}
                  aria-label="Moins de mots"
                  onClick={() => setPaliers((p) => ({ ...p, [cle]: 1 }))}
                >
                  −
                </button>
              )}
            </div>
          </section>
        );
      })}

      {/* Les autres mots, choisis parmi les suggestions. */}
      {choisis.libres.length > 0 && (
        <ul className={styles.mots}>
          {choisis.libres.map((m) => (
            <li key={m} className={styles.mot}>
              <span>{m}</span>
              <button type="button" className={styles.retirer} onClick={() => basculer("libres", m)}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
      {choisis.libres.length < MAXIMUM_MOTS_AUTEUR && (
        <div className={styles.zoneSaisie}>
          <input
            type="text"
            maxLength={60}
            aria-labelledby="mots-cles-auteur-libelle"
            autoComplete="off"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={(e) => {
              // Entrée prend la première suggestion au lieu d'envoyer le formulaire.
              if (e.key === "Enter") {
                e.preventDefault();
                if (proposees[0]) prendre(proposees[0]);
              }
              if (e.key === "Escape") setSuggestions([]);
            }}
          />
          {proposees.length > 0 && (
            <ul className={styles.suggestions} role="listbox">
              {proposees.map((s) => (
                <li key={s}>
                  <button type="button" role="option" aria-selected={false} onClick={() => prendre(s)}>
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
