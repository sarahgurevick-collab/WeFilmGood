"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  motsClesProches,
  type Categorie,
  type MotCle,
  type PersonnageTrouve,
  type ProjetTrouve,
  type TalentTrouve,
} from "@/app/pitchotheque/actions";
import { AUCUN, adresse, type Filtres } from "@/app/pitchotheque/filtres";
import Bandeau from "./Bandeau";
import LogoComplet from "./LogoComplet";
import formStyles from "./form.module.css";
import NuageDisque from "./NuageDisque";
import TroisBilles from "./TroisBilles";
import styles from "./Finder.module.css";
import projetsStyles from "@/app/pitchotheque/projets.module.css";

const PAS = 20;
const MIN = 20;
const MAX = 200;
const DEFAUT = 80;
// En dessous, trop peu de mots pour dessiner le disque : on les liste.
const G_MINIMUM = 20;
// Le petit disque de la barre : peu de mots, pour que la forme se lise.
const ICONE_MOTS = 30;
// Les rangées 2 et 3 : un aperçu d'une ligne.
const APERCU = 5;

const CATEGORIES: { cle: Categorie; pastille: string; titre: string }[] = [
  { cle: "projets", pastille: "Projets", titre: "Projets" },
  { cle: "talents", pastille: "Talents", titre: "Talents" },
  { cle: "personnages", pastille: "Personnages", titre: "Personnages" },
];

export default function Finder({
  adherent = false,
  filtres = AUCUN,
  premiere = "projets",
  requeteInitiale = "",
}: {
  adherent?: boolean;
  /** Les filtres de la recherche avancée, qui s'ajoutent au mot cherché. */
  filtres?: Filtres;
  /** La catégorie en tête en arrivant, selon le métier du membre. */
  premiere?: Categorie;
  /** Une recherche déjà écrite en arrivant (?q=…), depuis le journal de l'administration. */
  requeteInitiale?: string;
}) {
  const router = useRouter();
  const [requete, setRequete] = useState(requeteInitiale);
  // Un seul champ pour trois catégories (29/09) : celle choisie passe en
  // tête, en grand ; les deux autres suivent en aperçu.
  const [choisie, setChoisie] = useState<Categorie>(premiere);
  const [talents, setTalents] = useState<{ liste: TalentTrouve[]; total: number } | null>(null);
  const [personnages, setPersonnages] = useState<{ liste: PersonnageTrouve[]; total: number } | null>(null);
  const [resultats, setResultats] = useState<ProjetTrouve[] | null>(null);
  // Les mots-clés voisins par le sens qui ont complété la recherche.
  const [parLeSens, setParLeSens] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [enCours, setEnCours] = useState(false);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Le nuage est fermé en arrivant : un petit disque à droite de la
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
      setTalents(null);
      setPersonnages(null);
      setEnCours(false);
      return;
    }

    setEnCours(true);
    // Une recherche par arrêt de frappe ; celle d'avant est annulée, pour
    // que les résultats de « arc » n'arrivent jamais après « architecte ».
    const annulation = new AbortController();
    minuteur.current = setTimeout(async () => {
      const params = new URLSearchParams({ q });
      for (const [cle, valeur] of Object.entries(filtres)) if (valeur) params.set(cle, valeur);
      try {
        const reponse = await fetch(`/api/recherche?${params}`, { signal: annulation.signal });
        if (!reponse.ok) throw new Error(String(reponse.status));
        const r = (await reponse.json()) as {
          projets: ProjetTrouve[];
          total: number;
          parLeSens: string[];
          talents: TalentTrouve[];
          totalTalents: number;
          personnages: PersonnageTrouve[];
          totalPersonnages: number;
        };
        setResultats(r.projets);
        setTotal(r.total);
        setParLeSens(r.parLeSens);
        setTalents({ liste: r.talents, total: r.totalTalents });
        setPersonnages({ liste: r.personnages, total: r.totalPersonnages });
        setEnCours(false);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setResultats([]);
        setTotal(0);
        setTalents({ liste: [], total: 0 });
        setPersonnages({ liste: [], total: 0 });
        setEnCours(false);
      }
    }, 350);

    return () => {
      annulation.abort();
      if (minuteur.current) clearTimeout(minuteur.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- les filtres sont comparés par valeur
  }, [requete, filtres.format, filtres.genre, filtres.audience, filtres.budget, filtres.bandeau, filtres.equipe, filtres.selection, filtres.comedien]);

  // Le nuage suit ce qui est tapé, tant qu'il est ouvert : il ne reste
  // jamais figé sur une liste générique une fois qu'on cherche quelque
  // chose de précis.
  useEffect(() => {
    // Chargé même fermé : le petit disque de la barre est dessiné avec.
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
  const nombreEnTete =
    choisie === "projets" ? total : choisie === "talents" ? (talents?.total ?? 0) : (personnages?.total ?? 0);
  const effectifMax = Math.max(1, ...(nuage ?? []).map((m) => m.effectif));
  const tailleDe = (effectif: number) => {
    const ratio = Math.min(1, effectif / effectifMax);
    return 13 + Math.round(ratio * 15); // 13px à 28px
  };

  return (
    <div className={styles.zone}>
      <div className={styles.barre}>
        <span className={`${formStyles.recherche} ${styles.champZone}`}>
          <input
            type="search"
            className={styles.champ}
            placeholder="Chercher un projet, un thème, un mot-clé…"
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
          />
        </span>
        {/* Un seul emplacement, à droite du champ (03/10, demande de Sarah) : les
            billes pendant la recherche, puis le nombre de résultats quand elles
            s'arrêtent. Sans mot cherché, c'est le petit disque du nuage. */}
        {requete.trim() && (
          <span className={styles.emplacementResultat} aria-live="polite">
            {enCours ? (
              <TroisBilles libelle="Recherche…" />
            ) : (
              <span className={styles.compte}>
                {nombreEnTete} résultat{nombreEnTete > 1 ? "s" : ""}
              </span>
            )}
          </span>
        )}
        {adherent && !requete.trim() && (
          <button
            type="button"
            className={`${styles.iconeG} ${nuageAffiche ? styles.iconeGOuverte : ""}`}
            onClick={() => setNuageDemande((v) => !v)}
            aria-expanded={nuageAffiche}
            aria-label={nuageAffiche ? "Fermer les mots-clés" : "Ouvrir les mots-clés"}
            title={nuageAffiche ? "Fermer les mots-clés" : "Explorer les mots-clés"}
          >
            {nuage && nuage.length >= G_MINIMUM ? (
              <NuageDisque mots={nuage.slice(0, ICONE_MOTS)} icone />
            ) : (
              // Trop peu de mots pour dessiner le nuage : le disque du logo,
              // en rouge (27/09 ; c'était un « G », qui évoquait Google).
              <svg viewBox="77 28 1066 1064" className={styles.iconeDisque} aria-hidden="true">
                <mask id="disque-logo">
                  <circle cx="609.5" cy="560" r="532" fill="#fff" />
                  <rect x="831" y="359" width="400" height="800" fill="#000" />
                  <rect x="644" y="590" width="400" height="800" fill="#000" />
                  <rect x="445" y="823" width="400" height="800" fill="#000" />
                </mask>
                <rect x="0" y="0" width="1300" height="1200" fill="var(--rouge-wfg)" mask="url(#disque-logo)" />
              </svg>
            )}
          </button>
        )}
      </div>

      <div className={styles.pastilles} role="group" aria-label="Catégorie en tête des résultats">
        <span className={styles.pastillesIntro}>J&apos;explore mes galaxies…</span>
        {CATEGORIES.map((c) => (
          <button
            key={c.cle}
            type="button"
            className={`${styles.pastille} ${choisie === c.cle ? styles.pastilleChoisie : ""}`}
            aria-pressed={choisie === c.cle}
            onClick={() => {
              setChoisie(c.cle);
              // Sans mot cherché, la page elle-même change : les talents
              // ou les personnages à la place des projets, et retour (02/10).
              if (!requete.trim()) {
                router.push(c.cle === "projets" ? adresse(filtres) : `/pitchotheque?voir=${c.cle}`);
              }
            }}
          >
            {c.pastille}
          </button>
        ))}
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
            <NuageDisque
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
          {enCours ? null : (
            [choisie, ...CATEGORIES.map((c) => c.cle).filter((c) => c !== choisie)].map((cle, rang) => {
              const titre = CATEGORIES.find((c) => c.cle === cle)!.titre;
              const nombre =
                cle === "projets" ? total : cle === "talents" ? (talents?.total ?? 0) : (personnages?.total ?? 0);
              const enTete = rang === 0;
              return (
                <section key={cle} className={`${styles.rangee} ${enTete ? styles.rangeeEnTete : ""}`}>
                  <div className={styles.rangeeTete}>
                    <h2>
                      <span className={styles.rang}>{rang + 1}</span>
                      {titre}
                    </h2>
                    {!enTete && nombre > 0 ? (
                      <button type="button" className={styles.voirTout} onClick={() => setChoisie(cle)}>
                        Voir les {nombre} {titre.toLowerCase()} →
                      </button>
                    ) : (
                      !enTete && (
                        <span className={styles.compte}>
                          {nombre} résultat{nombre > 1 ? "s" : ""}
                        </span>
                      )
                    )}
                  </div>
                  {cle === "projets" && enTete && total > 0 && (
                    <p className={styles.indice}>
                      {total > (resultats?.length ?? 0) && `Les ${resultats?.length} premiers affichés.`}
                      {parLeSens.length > 0 && (
                        <> Dont des projets proches par le sens&nbsp;: {parLeSens.join(", ")}.</>
                      )}
                    </p>
                  )}
                  {nombre === 0 ? (
                    <p className={styles.indice}>
                      {/* Phrase de Sarah (30/09) ; le nuage s'ouvre d'un clic pour les adhérents. */}
                      Aucun résultat. Utilisez le{" "}
                      {adherent ? (
                        <button
                          type="button"
                          className={styles.lienNuage}
                          onClick={() => setNuageDemande(true)}
                        >
                          nuage de mots-clés
                        </button>
                      ) : (
                        <Link href="/adhesion" className={styles.lienNuage} title="Le nuage de mots-clés est réservé aux adhérents">
                          nuage de mots-clés
                        </Link>
                      )}
                    </p>
                  ) : cle === "projets" ? (
                    <ul className={`${projetsStyles.grille} ${enTete ? "" : styles.apercu}`}>
                      {(enTete ? resultats ?? [] : (resultats ?? []).slice(0, APERCU)).map((p) => (
                        <li key={p.id}>
                          <CarteProjet p={p} />
                        </li>
                      ))}
                    </ul>
                  ) : cle === "talents" ? (
                    <ul className={`${styles.grilleTalents} ${enTete ? "" : styles.apercu}`}>
                      {(enTete ? talents?.liste ?? [] : (talents?.liste ?? []).slice(0, APERCU)).map((t) => (
                        <li key={t.id}>
                          <CarteTalent t={t} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <ul className={`${styles.grillePersonnages} ${enTete ? "" : styles.apercu}`}>
                      {(enTete ? personnages?.liste ?? [] : (personnages?.liste ?? []).slice(0, APERCU)).map((c) => (
                        <li key={c.id}>
                          <CartePersonnage c={c} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function CarteProjet({ p }: { p: ProjetTrouve }) {
  return (
    <Link href={`/projet/${p.id}`} className={projetsStyles.carte}>
      <div className={projetsStyles.vignette}>
        <Bandeau valeur={p.bandeau} />
        {p.vignette ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.vignette} alt="" loading="lazy" />
          </>
        ) : (
          <span className={projetsStyles.sansImage}>Sans vignette</span>
        )}
      </div>
      <div className={projetsStyles.legende}>
        <strong>
          {p.title}
          {p.status === "labellise" && (
            <span className={projetsStyles.label} title="Projet labellisé WeFilmGood">
              <LogoComplet hauteur={22} />
            </span>
          )}
        </strong>
        {p.genre?.label_fr && <span className={projetsStyles.genre}>{p.genre.label_fr}</span>}
        {p.logline && <p className={projetsStyles.logline}>{p.logline}</p>}
      </div>
    </Link>
  );
}

/** Un talent : rond, comme sa photo de profil. Sans photo, l'initiale. */
export function CarteTalent({ t }: { t: TalentTrouve }) {
  const contenu = (
    <>
      <span className={styles.talentPhoto}>
        {t.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.photo} alt="" loading="lazy" />
        ) : t.masque ? (
          // Sans photo et sans nom : une silhouette plutôt qu'une initiale.
          <svg viewBox="0 0 24 24" width="40%" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ) : (
          <span>{t.nom.trim().charAt(0).toUpperCase()}</span>
        )}
      </span>
      {!t.masque && <strong>{t.nom}</strong>}
      {t.metiers.length > 0 && <span className={styles.detail}>{t.metiers.join(", ")}</span>}
      {t.ville && <span className={styles.detail}>{t.ville}</span>}
    </>
  );
  // Masqué : pas de lien vers le profil, dont la biographie cite souvent
  // le nom (02/10).
  return t.masque ? (
    <div className={styles.talent}>{contenu}</div>
  ) : (
    <Link href={`/membres/${t.id}`} className={styles.talent}>
      {contenu}
    </Link>
  );
}

/** Un personnage : son portrait, et le projet d'où il vient. */
export function CartePersonnage({ c }: { c: PersonnageTrouve }) {
  return (
    // La fiche du projet s'ouvre sur ce personnage, biographie dépliée.
    <Link href={`/projet/${c.projetId}?personnage=${c.id}#personnage-${c.id}`} className={styles.personnage}>
      <span className={styles.portrait}>
        {c.portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.portrait} alt="" loading="lazy" />
        ) : (
          <span>{c.nom.trim().charAt(0).toUpperCase()}</span>
        )}
      </span>
      <strong>{c.nom}</strong>
      <span className={styles.detail}>{c.projet}</span>
      {c.comedien && <span className={styles.detail}>{c.comedien}</span>}
    </Link>
  );
}
