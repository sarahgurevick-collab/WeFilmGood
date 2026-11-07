"use client";

import { useMemo, useState } from "react";
import formStyles from "@/components/form.module.css";
import { NUAGES_MOTS_CLES, type LigneNuage } from "@/data/nuagesMotsCles";
import styles from "./mots-cles-auteur.module.css";

/** Dix mots au plus par ligne (07/11/2026, Sarah : « Limite à 10 par catégorie »). */
export const MAXIMUM_MOTS_AUTEUR = 10;
/** Combien de mots chaque nuage montre d'abord, puis à chaque « + ». */
const PAR_PALIER = 40;

type Cle = LigneNuage["cle"] | "libres";

const cleDe = (mot: string) =>
  mot
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/**
 * Les mots-clés choisis par l'auteur, sous la logline (07/11/2026, Sarah).
 * Trois nuages repris de WFG 1 (src/data/nuagesMotsCles.ts) : un clic
 * choisit un mot, un second le rend ; dix au plus par ligne. En dessous, un
 * champ pour les mots qui ne sont dans aucun nuage (dix au plus aussi) : un
 * mot s'ajoute à la touche Entrée, à la virgule ou en quittant le champ ;
 * s'il est dans un nuage, c'est ce mot du nuage qui est choisi. Le
 * formulaire envoie un champ caché par mot.
 */
export default function MotsClesAuteur({ initiaux }: { initiaux: string[] }) {
  // Où se trouve chaque mot des nuages, pour ranger les mots déjà choisis.
  const ligneDe = useMemo(() => {
    const m = new Map<string, { cle: LigneNuage["cle"]; mot: string }>();
    for (const l of NUAGES_MOTS_CLES) for (const [mot] of l.mots) m.set(cleDe(mot), { cle: l.cle, mot });
    return m;
  }, []);

  const [choisis, setChoisis] = useState<Record<Cle, string[]>>(() => {
    const depart: Record<Cle, string[]> = { styles: [], sujets: [], univers: [], libres: [] };
    for (const brut of initiaux) {
      const trouve = ligneDe.get(cleDe(brut));
      const cle: Cle = trouve ? trouve.cle : "libres";
      if (depart[cle].length < MAXIMUM_MOTS_AUTEUR) depart[cle].push(trouve ? trouve.mot : brut);
    }
    return depart;
  });
  const [paliers, setPaliers] = useState<Record<LigneNuage["cle"], number>>({ styles: 1, sujets: 1, univers: 1 });
  const [saisie, setSaisie] = useState("");

  const basculer = (cle: Cle, mot: string) =>
    setChoisis((avant) => {
      const liste = avant[cle];
      if (liste.includes(mot)) return { ...avant, [cle]: liste.filter((x) => x !== mot) };
      if (liste.length >= MAXIMUM_MOTS_AUTEUR) return avant;
      return { ...avant, [cle]: [...liste, mot] };
    });

  const ajouter = (brut: string) => {
    const nouveaux = brut
      .split(",")
      .map((m) => m.trim().replace(/\s+/g, " ").slice(0, 60))
      .filter(Boolean);
    setSaisie("");
    if (!nouveaux.length) return;
    setChoisis((avant) => {
      const suite = { ...avant, libres: [...avant.libres] } as Record<Cle, string[]>;
      for (const m of nouveaux) {
        const trouve = ligneDe.get(cleDe(m));
        const cle: Cle = trouve ? trouve.cle : "libres";
        const mot = trouve ? trouve.mot : m;
        const liste = (suite[cle] = [...suite[cle]]);
        if (liste.length >= MAXIMUM_MOTS_AUTEUR) continue;
        if (!liste.some((x) => cleDe(x) === cleDe(mot))) liste.push(mot);
      }
      return suite;
    });
  };

  const tous = [...choisis.styles, ...choisis.sujets, ...choisis.univers, ...choisis.libres];

  return (
    <div className={formStyles.field}>
      <span id="mots-cles-auteur-libelle">
        Optimisez la recherche avec des mots-clés adaptés à votre projet pour booster sa visibilité.
      </span>
      {tous.map((m) => (
        <input key={m} type="hidden" name="mots_cles_auteur" value={m} />
      ))}

      {NUAGES_MOTS_CLES.map((ligne) => {
        const liste = choisis[ligne.cle];
        const plein = liste.length >= MAXIMUM_MOTS_AUTEUR;
        const visibles = ligne.mots.slice(0, paliers[ligne.cle] * PAR_PALIER);
        // Un mot choisi reste visible même s'il est loin dans le nuage.
        const caches = liste.filter((m) => !visibles.some(([v]) => v === m));
        const max = Math.log(1 + (ligne.mots[0]?.[1] ?? 1));
        const taille = (n: number) => 13 + Math.round((9 * Math.log(1 + n)) / max);
        return (
          <section key={ligne.cle} className={styles.ligne} aria-label={ligne.titre}>
            <p className={styles.titreLigne}>
              <span>{ligne.titre}</span>
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
                    onClick={() => basculer(ligne.cle, mot)}
                  >
                    {mot}
                  </button>
                );
              })}
              {visibles.length < ligne.mots.length && (
                <button
                  type="button"
                  className={styles.plus}
                  aria-label="Plus de mots"
                  onClick={() => setPaliers((p) => ({ ...p, [ligne.cle]: p[ligne.cle] + 1 }))}
                >
                  +
                </button>
              )}
              {paliers[ligne.cle] > 1 && (
                <button
                  type="button"
                  className={styles.plus}
                  aria-label="Moins de mots"
                  onClick={() => setPaliers((p) => ({ ...p, [ligne.cle]: 1 }))}
                >
                  −
                </button>
              )}
            </div>
          </section>
        );
      })}

      {/* Les mots qui ne sont dans aucun nuage. */}
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
        <input
          type="text"
          maxLength={200}
          aria-labelledby="mots-cles-auteur-libelle"
          value={saisie}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) ajouter(v);
            else setSaisie(v);
          }}
          onKeyDown={(e) => {
            // Entrée ajoute le mot au lieu d'envoyer le formulaire.
            if (e.key === "Enter") {
              e.preventDefault();
              ajouter(saisie);
            }
          }}
          onBlur={() => ajouter(saisie)}
        />
      )}
    </div>
  );
}
