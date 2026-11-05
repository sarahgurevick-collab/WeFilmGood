"use client";

import Link from "next/link";
import Pagination from "./Pagination";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  motsClesProches,
  type Categorie,
  type MotCle,
  type PersonnageTrouve,
  type ProjetTrouve,
  type TalentTrouve,
} from "@/app/pitchotheque/actions";
import { AUCUN, CLES, adresse, type Filtres } from "@/app/pitchotheque/filtres";
import { FiltresContexte, TagsChoisis, type Famille, type Tag } from "@/app/pitchotheque/tags";
import Bandeau from "./Bandeau";
import LogoComplet from "./LogoComplet";
import MarqueDejaOuvert from "./MarqueDejaOuvert";
import PersonnagesCarte from "./PersonnagesCarte";
import EquipeCarte from "./EquipeCarte";
import NuageCouleurs from "./NuageCouleurs";
import NuageDisque from "./NuageDisque";
import OrbeAttente from "./OrbeAttente";
import styles from "./Finder.module.css";
import projetsStyles from "@/app/pitchotheque/projets.module.css";

// Résultats par page de recherche (le même nombre que côté serveur).
const PAR_PAGE = 60;
const PAS = 20;
const MIN = 20;
const MAX = 200;
const DEFAUT = 80;
// En dessous, trop peu de mots pour dessiner le disque : on les liste.
const G_MINIMUM = 20;
// Les rangées 2 et 3 : un aperçu d'une ligne.
const APERCU = 5;

const CATEGORIES: { cle: Categorie; pastille: string; titre: string }[] = [
  { cle: "projets", pastille: "Projets", titre: "Projets" },
  { cle: "talents", pastille: "Talents", titre: "Talents" },
  { cle: "personnages", pastille: "Personnages", titre: "Personnages" },
];

export default function Finder({
  adherent = false,
  filtres: filtresDeLaPage = AUCUN,
  premiere = "projets",
  requeteInitiale = "",
  avance,
  tags = [],
  children,
}: {
  adherent?: boolean;
  /** Les filtres de la recherche avancée, qui s'ajoutent au mot cherché. */
  filtres?: Filtres;
  /** La catégorie en tête en arrivant, selon le métier du membre. */
  premiere?: Categorie;
  /** Une recherche déjà écrite en arrivant (?q=…), depuis le journal de l'administration. */
  requeteInitiale?: string;
  /** La recherche avancée : toujours affichée sous les résultats. */
  avance?: ReactNode;
  /** Les tags de la recherche avancée ; les choisis s'affichent dans la barre. */
  tags?: Tag[];
  /** La liste qui suit : masquée dès qu'un mot est cherché. */
  children?: ReactNode;
}) {
  const router = useRouter();
  // Les filtres changent ici tout de suite (le tag monte aussitôt dans la
  // barre), puis l'adresse suit et la page se recharge avec la liste filtrée.
  const [filtres, setFiltres] = useState<Filtres>(filtresDeLaPage);
  const cleDeLaPage = CLES.map((c) => filtresDeLaPage[c] ?? "").join("|");
  const [cleVue, setCleVue] = useState(cleDeLaPage);
  if (cleVue !== cleDeLaPage) {
    // La page est revenue avec d'autres filtres (lien, retour arrière) : on les reprend.
    setCleVue(cleDeLaPage);
    setFiltres(filtresDeLaPage);
  }
  const appliquer = (nouveaux: Filtres) => {
    setFiltres(nouveaux);
    setPageRecherche(1);
    router.push(adresse(nouveaux), { scroll: false });
  };
  const contexte = {
    filtres,
    tags,
    choisir: (famille: Famille, valeur: string | null) => appliquer({ ...filtres, [famille]: valeur }),
    effacer: () => appliquer(AUCUN),
  };
  const [requete, setRequete] = useState(requeteInitiale);
  // Un seul champ pour trois catégories (29/09) : celle choisie passe en
  // tête, en grand ; les deux autres suivent en aperçu.
  const [choisie, setChoisie] = useState<Categorie>(premiere);
  // La page des résultats de la catégorie choisie (03/10) ; elle revient à 1
  // quand le mot, les filtres ou la catégorie changent.
  const [pageRecherche, setPageRecherche] = useState(1);
  const derniereRequete = useRef("");
  const [talents, setTalents] = useState<{ liste: TalentTrouve[]; total: number } | null>(null);
  const [personnages, setPersonnages] = useState<{ liste: PersonnageTrouve[]; total: number } | null>(null);
  const [resultats, setResultats] = useState<ProjetTrouve[] | null>(null);
  const [total, setTotal] = useState(0);
  // Les premiers résultats montrent le mot tapé sur leur fiche, les suivants
  // ne l'ont qu'en mot-clé ou par le sens : la grille marque la césure
  // d'un trait (02/11, Sarah).
  const [nbAvantLeTrait, setNbAvantLeTrait] = useState(0);
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
    // Le délai ne sert qu'à la frappe : changer de page ou de catégorie part tout de suite.
    const delai = derniereRequete.current === q ? 0 : 350;
    derniereRequete.current = q;
    // Une recherche par arrêt de frappe ; celle d'avant est annulée, pour
    // que les résultats de « arc » n'arrivent jamais après « architecte ».
    const annulation = new AbortController();
    minuteur.current = setTimeout(async () => {
      const params = new URLSearchParams({ q, cat: choisie, page: String(pageRecherche) });
      for (const [cle, valeur] of Object.entries(filtres)) if (valeur) params.set(cle, valeur);
      try {
        const reponse = await fetch(`/api/recherche?${params}`, { signal: annulation.signal });
        if (!reponse.ok) throw new Error(String(reponse.status));
        const r = (await reponse.json()) as {
          projets: ProjetTrouve[];
          total: number;
          nbAvantLeTrait: number;
          talents: TalentTrouve[];
          totalTalents: number;
          personnages: PersonnageTrouve[];
          totalPersonnages: number;
        };
        setResultats(r.projets);
        setTotal(r.total);
        setNbAvantLeTrait(r.nbAvantLeTrait ?? r.total);
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
    }, delai);

    return () => {
      annulation.abort();
      if (minuteur.current) clearTimeout(minuteur.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- les filtres sont comparés par valeur
  }, [requete, choisie, pageRecherche, filtres.format, filtres.genre, filtres.audience, filtres.budget, filtres.bandeau, filtres.equipe, filtres.selection, filtres.comedien]);

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
  const choisir = (cle: Categorie) => {
    setChoisie(cle);
    setPageRecherche(1);
  };
  // Un clic sur le mot passe à la galaxie suivante. Sans mot cherché, la page
  // elle-même change (02/10) : on attend que les clics s'arrêtent pour ne
  // recharger qu'une fois.
  const minuteurMode = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titreChoisi = CATEGORIES.find((c) => c.cle === choisie)?.pastille ?? "Projets";
  const modeSuivant = () => {
    const i = CATEGORIES.findIndex((c) => c.cle === choisie);
    const suivante = CATEGORIES[(i + 1) % CATEGORIES.length].cle;
    choisir(suivante);
    if (!requete.trim()) {
      if (minuteurMode.current) clearTimeout(minuteurMode.current);
      minuteurMode.current = setTimeout(() => {
        router.push(suivante === "projets" ? adresse(filtres) : `/pitchotheque?voir=${suivante}`);
      }, 700);
    }
  };
  const changerDePage = (n: number) => {
    setPageRecherche(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const nombreAffiche = (cle: Categorie) =>
    (cle === "projets" ? resultats?.length : cle === "talents" ? talents?.liste.length : personnages?.liste.length) ?? 0;
  const nombreEnTete =
    choisie === "projets" ? total : choisie === "talents" ? (talents?.total ?? 0) : (personnages?.total ?? 0);
  const effectifMax = Math.max(1, ...(nuage ?? []).map((m) => m.effectif));
  const tailleDe = (effectif: number) => {
    const ratio = Math.min(1, effectif / effectifMax);
    return 13 + Math.round(ratio * 15); // 13px à 28px
  };

  return (
    <FiltresContexte.Provider value={contexte}>
    <div className={styles.zone}>
      <div className={styles.barre}>
        <TagsChoisis />
        {/* Les trois galaxies dans le champ lui-même (04/11, Sarah, modèle « morphing
            input » de 21st.dev) : un clic sur le mot à gauche passe à la suivante. */}
        <span className={`${styles.champZone} ${styles.champModes}`}>
          <motion.button
            type="button"
            layout
            transition={{ layout: { type: "spring", damping: 22, stiffness: 260 } }}
            className={styles.mode}
            data-categorie={choisie}
            onClick={modeSuivant}
            aria-label={`J'explore mes galaxies : ${titreChoisi}. Cliquer pour changer`}
            title="J'explore mes galaxies…"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={choisie} className={styles.modeMot}>
                {titreChoisi.split("").map((lettre, i) => (
                  <motion.span
                    key={`${choisie}-${i}`}
                    className={styles.modeLettre}
                    initial={{ opacity: 0, rotateX: 80, y: 8, filter: "blur(3px)" }}
                    animate={{ opacity: 1, rotateX: 0, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, rotateX: -80, y: -8, filter: "blur(3px)" }}
                    transition={{ delay: 0.02 * i, type: "spring", damping: 16, stiffness: 240, mass: 1.2 }}
                  >
                    {lettre}
                  </motion.span>
                ))}
              </motion.span>
            </AnimatePresence>
            <svg className={styles.modeFleches} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 9l5-5 5 5M7 15l5 5 5-5" />
            </svg>
          </motion.button>
          <input
            type="search"
            className={styles.champModesInput}
            placeholder="Chercher un projet, un thème, un mot-clé…"
            value={requete}
            onChange={(e) => {
              setRequete(e.target.value);
              setPageRecherche(1);
            }}
          />
        </span>
        {/* Un seul emplacement, à droite du champ (03/10, demande de Sarah) : l'escalier
            rouge (29/10, avant : trois billes) pendant la recherche, puis le nombre de résultats quand elles
            s'arrêtent. Sans mot cherché, c'est le petit disque du nuage. */}
        {requete.trim() && (
          <span className={styles.emplacementResultat} aria-live="polite">
            {enCours ? (
              <OrbeAttente taille={60} libelle="Recherche en cours" />
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
            <NuageCouleurs className={styles.iconeDisque} />
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
            <div className={styles.indice}><OrbeAttente taille={100} /></div>
          ) : !nuage || nuage.length === 0 ? (
            <p className={styles.indice}>Aucun mot-clé pour l&apos;instant.</p>
          ) : nuage.length >= G_MINIMUM ? (
            <NuageDisque
              mots={nuage}
              onChoisir={(label) => {
                setRequete(label);
                setPageRecherche(1);
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
                    setPageRecherche(1);
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
            // Seule la catégorie choisie s'affiche (05/11, Sarah) : l'équipe est
            // déjà sous chaque carte projet, et le sélecteur suffit pour
            // passer d'une catégorie à l'autre.
            ([choisie] as Categorie[]).map((cle, rang) => {
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
                      <button type="button" className={styles.voirTout} onClick={() => choisir(cle)}>
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
                  {enTete && nombre > 0 && (
                    <p className={styles.indice}>
                      {`${titre} ${((pageRecherche - 1) * PAR_PAGE + 1).toLocaleString("fr-FR")} à ${((pageRecherche - 1) * PAR_PAGE + nombreAffiche(cle)).toLocaleString("fr-FR")} sur ${nombre.toLocaleString("fr-FR")}.`}
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
                    (() => {
                      // Les projets où le mot est visible sur la fiche, puis,
                      // dans une zone à part (choix de Sarah, 02/11), ceux
                      // rapprochés par un mot-clé ou par le sens. Le rang
                      // compte toute la liste, pages comprises.
                      const liste = enTete ? resultats ?? [] : (resultats ?? []).slice(0, APERCU);
                      const premier = enTete ? (pageRecherche - 1) * PAR_PAGE : 0;
                      const devant = nbAvantLeTrait > 0 ? liste.filter((_, i) => premier + i < nbAvantLeTrait) : liste;
                      const derriere = nbAvantLeTrait > 0 ? liste.filter((_, i) => premier + i >= nbAvantLeTrait) : [];
                      const grille = (projets: ProjetTrouve[]) => (
                        <ul className={`${projetsStyles.grille} ${enTete ? "" : styles.apercu}`}>
                          {projets.map((p) => (
                            <li key={p.id}>
                              <CarteProjet p={p} requete={requete} />
                            </li>
                          ))}
                        </ul>
                      );
                      return (
                        <>
                          {devant.length > 0 && grille(devant)}
                          {derriere.length > 0 && (
                            <section className={projetsStyles.zoneSens} aria-label="Projets rapprochés par le sens">
                              <p className={projetsStyles.zoneSensTitre}>Rapprochés par le sens</p>
                              {grille(derriere)}
                            </section>
                          )}
                        </>
                      );
                    })()
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
                  {enTete && (
                    <Pagination
                      page={pageRecherche}
                      pages={Math.ceil(nombre / PAR_PAGE)}
                      total={nombre}
                      parPage={PAR_PAGE}
                      surChangement={changerDePage}
                      libelle="Pages des résultats"
                    />
                  )}
                </section>
              );
            })
          )}
        </div>
      )}
    </div>
    {avance}
    {!requete.trim() && children}
    </FiltresContexte.Provider>
  );
}

/** La carte emporte le mot cherché : la fiche ouverte le montre en rouge (02/11, Sarah). */
function CarteProjet({ p, requete }: { p: ProjetTrouve; requete: string }) {
  const q = requete.trim();
  return (
    <>
    <Link href={q ? `/projet/${p.id}?q=${encodeURIComponent(q)}` : `/projet/${p.id}`} className={projetsStyles.carte}>
      <div className={projetsStyles.vignette}>
        <Bandeau valeur={p.bandeau} />
        {p.vu && <MarqueDejaOuvert />}
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
        {p.tagline && <p className={projetsStyles.logline}>{p.tagline}</p>}
      </div>
    </Link>
    <EquipeCarte projetId={p.id} equipe={p.equipe} />
    <PersonnagesCarte projetId={p.id} personnages={p.personnages} />
    </>
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
          <img src={c.portrait} alt="" loading="lazy" style={{ objectPosition: c.cadrage }} />
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
