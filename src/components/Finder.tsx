"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  nuageMotsCles,
  rechercherProjets,
  type MotCle,
  type ProjetTrouve,
} from "@/app/projets/actions";
import styles from "./Finder.module.css";
import projetsStyles from "@/app/projets/projets.module.css";

export default function Finder() {
  const [requete, setRequete] = useState("");
  const [resultats, setResultats] = useState<ProjetTrouve[] | null>(null);
  const [total, setTotal] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [nuageVisible, setNuageVisible] = useState(false);
  const [nuage, setNuage] = useState<MotCle[] | null>(null);

  useEffect(() => {
    if (minuteur.current) clearTimeout(minuteur.current);

    const q = requete.trim();
    if (!q) {
      setResultats(null);
      setEnCours(false);
      return;
    }

    setEnCours(true);
    minuteur.current = setTimeout(async () => {
      const { projets, total } = await rechercherProjets(q);
      setResultats(projets);
      setTotal(total);
      setEnCours(false);
    }, 300);

    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [requete]);

  const ouvrirNuage = async () => {
    const prochain = !nuageVisible;
    setNuageVisible(prochain);
    if (prochain && !nuage) {
      const mots = await nuageMotsCles();
      setNuage(mots);
    }
  };

  const effectifMax = nuage?.[0]?.effectif ?? 1;
  const tailleDe = (effectif: number) => {
    const ratio = effectif / effectifMax;
    return 13 + Math.round(ratio * 15); // 13px à 28px
  };

  return (
    <div className={styles.zone}>
      <div className={styles.barre}>
        <input
          type="search"
          className={styles.champ}
          placeholder="Chercher un projet, un thème, un mot-clé…"
          value={requete}
          onChange={(e) => setRequete(e.target.value)}
        />
        <button type="button" className={styles.boutonNuage} onClick={ouvrirNuage}>
          {nuageVisible ? "Masquer les mots-clés" : "Voir les mots-clés"}
        </button>
      </div>

      {nuageVisible && (
        <div className={styles.nuage}>
          {!nuage ? (
            <p className={styles.indice}>Chargement…</p>
          ) : nuage.length === 0 ? (
            <p className={styles.indice}>Aucun mot-clé pour l&apos;instant.</p>
          ) : (
            nuage.map((m) => (
              <button
                key={m.label}
                type="button"
                className={styles.motCle}
                style={{ fontSize: tailleDe(m.effectif) }}
                onClick={() => {
                  setRequete(m.label);
                  setNuageVisible(false);
                }}
                title={`${m.effectif} projet${m.effectif > 1 ? "s" : ""}`}
              >
                {m.label}
              </button>
            ))
          )}
        </div>
      )}

      {requete.trim() && (
        <div className={styles.resultats}>
          {enCours ? (
            <p className={styles.indice}>Recherche…</p>
          ) : resultats && resultats.length > 0 ? (
            <>
              <p className={styles.indice}>
                {total} résultat{total > 1 ? "s" : ""} pour «&nbsp;{requete}&nbsp;»
                {total > resultats.length &&
                  ` — les ${resultats.length} plus récents affichés`}
              </p>
              <ul className={projetsStyles.grille}>
                {resultats.map((p) => (
                  <li key={p.id}>
                    <Link href={`/projets/${p.id}`} className={projetsStyles.carte}>
                      <div className={projetsStyles.vignette}>
                        {p.vignette ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.vignette} alt="" loading="lazy" />
                        ) : (
                          <span className={projetsStyles.sansImage}>Sans vignette</span>
                        )}
                        {p.status === "labellise" && (
                          <span className={projetsStyles.label}>Labellisé</span>
                        )}
                      </div>
                      <div className={projetsStyles.legende}>
                        <strong>{p.title}</strong>
                        {p.genre?.label_fr && (
                          <span className={projetsStyles.genre}>{p.genre.label_fr}</span>
                        )}
                        {p.logline && <p className={projetsStyles.logline}>{p.logline}</p>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className={styles.indice}>
              Aucun résultat pour «&nbsp;{requete}&nbsp;».{" "}
              <button type="button" className={styles.lienNuage} onClick={ouvrirNuage}>
                Voir les mots-clés existants
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
