"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  motsClesProches,
  rechercherProjets,
  type MotCle,
  type ProjetTrouve,
} from "@/app/projets/actions";
import NuageG from "./NuageG";
import styles from "./Finder.module.css";
import projetsStyles from "@/app/projets/projets.module.css";

const PAS = 20;
const MIN = 20;
const MAX = 200;
const DEFAUT = 80;
// En dessous, trop peu de mots pour dessiner le G : on les liste.
const G_MINIMUM = 20;
// Le petit G de la barre : peu de mots, pour que la lettre se lise.
const ICONE_MOTS = 30;

export default function Finder({ adherent = false }: { adherent?: boolean }) {
  const [requete, setRequete] = useState("");
  const [resultats, setResultats] = useState<ProjetTrouve[] | null>(null);
  const [total, setTotal] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Le nuage est fermé en arrivant : un petit G à droite de la
  // recherche l'ouvre en grand en dessous, et le referme.
  const [nuageDemande, setNuageDemande] = useState(false);
  // Combien de mots le nuage affiche : l'adhérent l'ajuste au + et au -,
  // et son choix le suit d'une visite à l'autre.
  const [combien, setCombien] = useState(DEFAUT);

  useEffect(() => {
    try {
      const garde = Number(localStorage.getItem("wfg-nuage-mots"));
      if (garde >= MIN && garde <= MAX) setCombien(garde);
    } catch {
      // Stockage refusé par le navigateur : on reste sur la valeur par défaut.
    }
  }, []);

  const ajuster = (delta: number) => {
    setCombien((n) => {
      const suivant = Math.min(MAX, Math.max(MIN, n + delta));
      try {
        localStorage.setItem("wfg-nuage-mots", String(suivant));
      } catch {
        // Sans stockage, le réglage vaut pour la visite en cours.
      }
      return suivant;
    });
  };
  const [nuage, setNuage] = useState<MotCle[] | null>(null);
  const [nuageEnCours, setNuageEnCours] = useState(false);
  const minuteurNuage = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nuageAffiche = adherent && nuageDemande;

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
    // Chargé même fermé : le petit G de la barre est dessiné avec.
    if (!adherent) return;
    if (minuteurNuage.current) clearTimeout(minuteurNuage.current);

    setNuageEnCours(true);
    minuteurNuage.current = setTimeout(async () => {
      const mots = await motsClesProches(requete, combien);
      setNuage(mots);
      setNuageEnCours(false);
    }, 300);

    return () => {
      if (minuteurNuage.current) clearTimeout(minuteurNuage.current);
    };
  }, [requete, adherent, combien]);

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
        {adherent && (
          <button
            type="button"
            className={`${styles.iconeG} ${nuageAffiche ? styles.iconeGOuverte : ""}`}
            onClick={() => setNuageDemande((v) => !v)}
            aria-expanded={nuageAffiche}
            aria-label={nuageAffiche ? "Fermer les mots-clés" : "Ouvrir les mots-clés"}
            title={nuageAffiche ? "Fermer les mots-clés" : "Explorer les mots-clés"}
          >
            {nuage && nuage.length >= G_MINIMUM ? (
              <NuageG mots={nuage.slice(0, ICONE_MOTS)} icone />
            ) : (
              <span className={styles.iconeGLettre}>G</span>
            )}
          </button>
        )}
      </div>

      {nuageAffiche && (
        <div className={styles.nuage}>
          <button
            type="button"
            className={styles.fermerNuage}
            onClick={() => {
              setNuageDemande(false);
            }}
            aria-label="Fermer les mots-clés"
            title="Fermer les mots-clés"
          >
            ×
          </button>
          <div className={styles.nuageEntete}>
            <p className={styles.nuageTitre}>
              {requete.trim()
                ? <>Mots-clés proches de «&nbsp;{requete}&nbsp;»</>
                : "Mots-clés les plus utilisés"}
            </p>
            <div className={styles.reglage}>
              <button
                type="button"
                onClick={() => ajuster(-PAS)}
                disabled={combien <= MIN}
                aria-label="Afficher moins de mots-clés"
                title="Moins de mots-clés"
              >
                −
              </button>
              <span>{combien} mots</span>
              <button
                type="button"
                onClick={() => ajuster(PAS)}
                disabled={combien >= MAX}
                aria-label="Afficher plus de mots-clés"
                title="Plus de mots-clés"
              >
                +
              </button>
            </div>
          </div>
          {nuageEnCours && !nuage ? (
            <p className={styles.indice}>Chargement…</p>
          ) : !nuage || nuage.length === 0 ? (
            <p className={styles.indice}>Aucun mot-clé pour l&apos;instant.</p>
          ) : nuage.length >= G_MINIMUM ? (
            <NuageG
              mots={nuage}
              onChoisir={(label) => {
                setRequete(label);
                setNuageDemande(false);
              }}
            />
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
              {adherent ? (
                !nuageAffiche && (
                  <button
                    type="button"
                    className={styles.lienNuage}
                    onClick={() => setNuageDemande(true)}
                  >
                    Voir les mots-clés proches
                  </button>
                )
              ) : (
                <Link href="/adhesion" className={styles.lienNuage}>
                  Les mots-clés proches sont réservés aux adhérents
                </Link>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
