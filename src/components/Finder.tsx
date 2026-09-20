"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  motsClesProches,
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

  // Le nuage s'affiche tant qu'on n'a rien tapé — c'est là qu'on a
  // besoin d'idées — et se rouvre à la demande quand une recherche ne
  // donne rien. Il n'a pas de bouton dédié : on le referme par sa croix.
  const [nuageDemande, setNuageDemande] = useState(false);
  const [nuageEcarte, setNuageEcarte] = useState(false);
  const [nuage, setNuage] = useState<MotCle[] | null>(null);
  const [nuageEnCours, setNuageEnCours] = useState(false);
  const minuteurNuage = useRef<ReturnType<typeof setTimeout> | null>(null);

  const vide = !requete.trim();
  const nuageAffiche = (vide && !nuageEcarte) || nuageDemande;

  // Recherche de projets, avec un léger délai pour ne pas interroger à
  // chaque frappe.
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

  // Le nuage suit ce qui est tapé, tant qu'il est ouvert : il ne reste
  // jamais figé sur une liste générique une fois qu'on cherche quelque
  // chose de précis.
  useEffect(() => {
    if (!nuageAffiche) return;
    if (minuteurNuage.current) clearTimeout(minuteurNuage.current);

    setNuageEnCours(true);
    minuteurNuage.current = setTimeout(async () => {
      const mots = await motsClesProches(requete);
      setNuage(mots);
      setNuageEnCours(false);
    }, 300);

    return () => {
      if (minuteurNuage.current) clearTimeout(minuteurNuage.current);
    };
  }, [requete, nuageAffiche]);

  // La liste est triée par ressemblance, pas par popularité : la
  // référence de taille doit être le mot le PLUS fréquent de la liste,
  // pas le premier. Sinon un mot populaire placé loin dans la liste
  // s'affichait démesurément gros (ex. "comédie dramatique", 292
  // projets, comparé à un premier mot n'en ayant qu'un seul).
  const effectifMax = Math.max(1, ...(nuage ?? []).map((m) => m.effectif));
  const tailleDe = (effectif: number) => {
    const ratio = Math.min(1, effectif / effectifMax);
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
      </div>

      {nuageAffiche && (
        <div className={styles.nuage}>
          <button
            type="button"
            className={styles.fermerNuage}
            onClick={() => {
              setNuageDemande(false);
              setNuageEcarte(true);
            }}
            aria-label="Fermer les mots-clés"
            title="Fermer les mots-clés"
          >
            ×
          </button>
          <p className={styles.nuageTitre}>
            {requete.trim()
              ? <>Mots-clés proches de «&nbsp;{requete}&nbsp;»</>
              : "Mots-clés les plus utilisés"}
          </p>
          {nuageEnCours && !nuage ? (
            <p className={styles.indice}>Chargement…</p>
          ) : !nuage || nuage.length === 0 ? (
            <p className={styles.indice}>Aucun mot-clé pour l&apos;instant.</p>
          ) : (
            <div className={styles.motsCles}>
              {nuage.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  className={styles.motCle}
                  style={{ fontSize: tailleDe(m.effectif) }}
                  onClick={() => {
                    setRequete(m.label);
                    setNuageDemande(false);
                  }}
                  title={`${m.effectif} projet${m.effectif > 1 ? "s" : ""}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
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
              {!nuageAffiche && (
                <button
                  type="button"
                  className={styles.lienNuage}
                  onClick={() => setNuageDemande(true)}
                >
                  Voir les mots-clés proches
                </button>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
