"use server";

import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { AUCUN, parametresRpc, type Filtres } from "./filtres";
import { enTexte, vecteur } from "@/lib/vecteurs";
import { equipesDesCartes, lectureRestreinte, type EquipeCarte } from "./equipe-carte";
import { SELECTION_PERSONNAGES, cheminsPortraits, personnagesDeLaCarte, type PersonnageBrut, type PersonnagesCarte } from "./personnages-carte";
import { photoNette } from "@/lib/photo";
import { clientCartes, clientProfils } from "@/lib/supabase/admin";
import { accesAuxFiches, sexeEtAge } from "@/lib/acces-fiches";
import type { ReactNode } from "react";
import { PERSONNAGES_PAR_PAGE, cartesPersonnages, lotDeCartes } from "./lot";

export type ProjetTrouve = {
  id: string;
  title: string;
  tagline: string | null;
  status: string;
  bandeau: string | null;
  genre: { label_fr: string } | null;
  vignette: string | null;
  /** Déjà ouvert par ce membre (03/10). */
  vu?: boolean;
  /** Les premiers personnages et leur nombre (14/10). */
  personnages?: PersonnagesCarte | null;
  /** Les talents déjà rattachés (19/10). */
  equipe?: EquipeCarte | null;
};

export type ResultatRecherche = {
  projets: ProjetTrouve[];
  total: number;
  /** Combien de projets, en tête de liste, montrent le mot tapé sur leur
      fiche ; les suivants ne l'ont qu'en mot-clé (invisible du producteur)
      ou par le voisinage de sens, et les Galaxies marquent la césure d'un
      trait (02/11, Sarah). */
  nbAvantLeTrait: number;
};

// La recherche par les lettres est demandée entière, jusque-là, avant
// d'être complétée par le sens (02/11) ; le sens en ajoute au plus SENS_MAX.
const LETTRES_MAX = 1000;
const SENS_MAX = 300;
// Un mot-clé compte comme voisin de sens à partir de cette proximité (0 à 1) — pour le nuage.
const PROXIMITE_MINIMALE = 0.45;
// Une fiche (titre, tagline, logline) compte comme proche par le sens à
// partir de cette proximité — réglée sur des essais : « boulangerie »
// trouve « Pain Perdu » (0,41), « banane » ne trouve rien (0,39 au mieux).
const PROXIMITE_FICHE = 0.4;

/**
 * Les projets des mots-clés voisins par le sens (27/09). Le vecteur de la
 * recherche est calculé sur le serveur ; les mots-clés les plus proches,
 * s'ils sont assez proches, donnent leurs projets. Rien si le modèle ne
 * répond pas : la recherche par les lettres reste seule, comme avant.
 */
async function projetsParLeSens(
  q: string,
  filtres: Filtres,
  dejaTrouves: Set<string>,
  limite: number,
): Promise<{ ids: string[]; mots: string[] }> {
  const v = await vecteur(q);
  if (!v) return { ids: [], mots: [] };
  const supabase = await createClient();
  const ids: string[] = [];
  const mots: string[] = [];
  // Les mots-clés voisins par le sens ne complètent plus la recherche
  // (30/09/2026) : sur un mot rare, le modèle rapproche par les lettres
  // (« tricot » → trilingue, triade, péniche…), et Sarah a trouvé le
  // résultat absurde. Ils restent dans le nuage, comme suggestion.

  // Le texte même des fiches (0097) : un projet qui parle de
  // poissons ou de pêcheurs remonte pour « sardine », même sans le mot.
  if (ids.length < limite) {
    const { data: fiches } = await supabase.rpc("projets_par_sens", {
      p_vecteur: enTexte(v),
      p_limite: limite,
      ...parametresRpc(filtres),
    });
    let ajoutes = 0;
    for (const f of (fiches ?? []) as { id: string; proximite: number }[]) {
      if (f.proximite < PROXIMITE_FICHE || dejaTrouves.has(f.id) || ids.length >= limite) continue;
      dejaTrouves.add(f.id);
      ids.push(f.id);
      ajoutes++;
    }
    if (ajoutes > 0) mots.push("le texte des fiches");
  }
  return { ids, mots };
}

// Résultats par page ; la base ne connaît que la limite : pour la page n, on
// lui demande les n × 60 premiers et on garde les 60 de la page (03/10).
const LIMITE = 60;

export async function rechercherProjets(
  requete: string,
  filtres: Filtres = AUCUN,
  page = 1,
): Promise<ResultatRecherche> {
  const q = requete.trim();
  if (!q) return { projets: [], total: 0, nbAvantLeTrait: 0 };

  const supabase = await createClient();

  // Les filtres de la recherche avancée s'ajoutent au mot cherché. On
  // demande toute la liste par les lettres (jusqu'à LETTRES_MAX) : il faut
  // la connaître entière pour que le sens n'y répète rien.
  const { data: trouves } = await supabase.rpc("rechercher_projets", {
    q,
    p_limite: Math.max(LIMITE * page, LETTRES_MAX),
    ...parametresRpc(filtres),
  });

  const lignes = (trouves ?? []) as { id: string; score: number; total: number }[];
  let ids: string[] = lignes.map((t) => t.id);
  let total = lignes[0]?.total ?? 0;

  // Le sens complète toujours les lettres (02/11, Sarah) : il faut faire
  // sortir le plus de projets possible, un producteur ne cherche pas deux
  // fois et réduit par les filtres. Jusqu'ici, seulement sous huit
  // résultats par les lettres. Les projets par les lettres d'abord, ceux
  // par le sens à la suite. (Au-delà de LETTRES_MAX par les lettres, la
  // liste n'est pas entière : on s'en tient aux lettres.)
  // Le trait (02/11, Sarah) : d'abord les projets où le mot est visible
  // sur la fiche, puis ceux qui ne l'ont qu'en mot-clé, puis le sens.
  let nbAvantLeTrait = ids.length;
  if (ids.length) {
    const { data: visibles } = await supabase.rpc("projets_mot_visible", { q, p_projets: ids });
    const visible = new Set((visibles ?? []) as string[]);
    const devant = ids.filter((id) => visible.has(id));
    const derriere = ids.filter((id) => !visible.has(id));
    ids = [...devant, ...derriere];
    nbAvantLeTrait = devant.length;
  }
  if (total <= ids.length) {
    const sens = await projetsParLeSens(q, filtres, new Set(ids), SENS_MAX);
    if (sens.ids.length) {
      ids.push(...sens.ids);
      total += sens.ids.length;
    }
  }
  if (ids.length === 0) return { projets: [], total: 0, nbAvantLeTrait: 0 };
  ids = ids.slice((page - 1) * LIMITE, page * LIMITE);
  if (ids.length === 0) return { projets: [], total, nbAvantLeTrait };

  const { data: projects } = await clientCartes(supabase)
    .from("projects")
    .select(
      `id, title, tagline, status, bandeau, genre:genres(label_fr), files:project_files(storage_path, kind), ${SELECTION_PERSONNAGES}`,
    )
    .in("id", ids)
    .eq("is_public", true)
    .returns<
      {
        id: string;
        title: string;
        tagline: string | null;
        status: string;
        bandeau: string | null;
        genre: { label_fr: string } | null;
        files: { storage_path: string; kind: string }[];
        characters: PersonnageBrut[] | null;
      }[]
    >();

  const chemins = (projects ?? [])
    .flatMap((p) => [
      (p.files ?? []).find((f) => f.kind === "vignette")?.storage_path,
      ...cheminsPortraits(p.characters),
    ])
    .filter((c): c is string => Boolean(c));

  const { data: signes } = chemins.length
    ? await supabase.storage.from("project-media").createSignedUrls(chemins, 60 * 60)
    : { data: [] };

  const urlDe = new Map((signes ?? []).map((s) => [s.path, s.signedUrl]));
  const ordreDe = new Map<string, number>(ids.map((id, i) => [id, i]));
  const { data: { user } } = await supabase.auth.getUser();
  const equipes = await equipesDesCartes(supabase, ids, await lectureRestreinte(supabase, user?.id));
  // Sans adhésion, le titre ne part pas vers le navigateur (12/11).
  const acces = await accesAuxFiches(supabase, user?.id);

  const projets: ProjetTrouve[] = (projects ?? [])
    .map((p) => {
      const chemin = (p.files ?? []).find((f) => f.kind === "vignette")?.storage_path;
      return {
        id: p.id,
        title: acces.voitLeTitre(p.id) ? p.title : "",
        tagline: p.tagline,
        status: p.status,
        bandeau: p.bandeau,
        genre: p.genre,
        vignette: chemin ? (urlDe.get(chemin) ?? null) : null,
        personnages: personnagesDeLaCarte(p.characters, urlDe),
        equipe: equipes.get(p.id) ?? null,
      };
    })
    .sort((a, b) => (ordreDe.get(a.id) ?? 0) - (ordreDe.get(b.id) ?? 0));

  return { projets, total, nbAvantLeTrait };
}

/** Un mot-clé du nuage : le mot français (la clé), son effectif, et son anglais s'il est traduit (08/11). */
export type MotCle = { label: string; effectif: number; labelEn?: string | null };

/** Sans recherche en cours : les mots-clés les plus utilisés, pour explorer. */
export async function nuageMotsCles(limite = 80): Promise<MotCle[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("nuage_mots_cles", { p_limite: limite });
  const lignes = (data ?? []) as { label_fr: string; effectif: number; label_en: string | null }[];
  return lignes.map((l) => ({ label: l.label_fr, effectif: l.effectif, labelEn: l.label_en }));
}

/** Avec une recherche en cours : les mots-clés existants les plus proches de ce qui est tapé. */
export async function motsClesProches(requete: string, limite = 80): Promise<MotCle[]> {
  const q = requete.trim();
  if (!q) return nuageMotsCles(limite);

  const supabase = await createClient();
  const { data } = await supabase.rpc("mots_cles_proches", { q, p_limite: limite });
  const lignes = (data ?? []) as { label_fr: string; effectif: number; score: number; label_en: string | null }[];
  const mots: MotCle[] = lignes.map((l) => ({ label: l.label_fr, effectif: l.effectif, labelEn: l.label_en }));

  // Le nuage se complète par le sens (27/09) : autour de « sardine »,
  // poisson, pêche, mer… même sans lettre commune.
  if (mots.length < limite) {
    const v = await vecteur(q);
    if (v) {
      const { data: sens } = await supabase.rpc("mots_cles_par_sens", { p_vecteur: enTexte(v), p_limite: limite });
      const deja = new Set(mots.map((m) => m.label));
      for (const m of (sens ?? []) as { label_fr: string; effectif: number; proximite: number; label_en: string | null }[]) {
        if (mots.length >= limite) break;
        if (m.proximite < PROXIMITE_MINIMALE || m.effectif === 0 || deja.has(m.label_fr)) continue;
        deja.add(m.label_fr);
        mots.push({ label: m.label_fr, effectif: m.effectif, labelEn: m.label_en });
      }
    }
  }
  return mots;
}

export type DecompteRecherche = {
  projets: number;
  talents: number;
  personnages: number;
};

/**
 * Le décompte affiché sur la page d'accueil : des nombres, jamais de
 * contenu. Les fiches sont réservées aux membres — droits à l'image sur
 * certaines photos, et protection du travail des auteurs, dont même la
 * logline ne s'adresse qu'à des professionnels.
 */
export async function compterRecherche(requete: string): Promise<DecompteRecherche> {
  const q = requete.trim();
  const vide = { projets: 0, talents: 0, personnages: 0 };
  if (!q) return vide;

  // Les mêmes nombres que dans les Galaxies (13/11, Sarah) : la base passe
  // par les mêmes recherches (migration 0264), et le sens complète les
  // projets comme dans rechercherProjets. Les trois nombres sont demandés
  // en même temps, pour ne pas attendre trois fois.
  const supabase = await createClient();
  const v = await vecteur(q);
  const p_vecteur = v ? enTexte(v) : null;
  const parties = ["projets", "talents", "personnages"] as const;
  const lignes = await Promise.all(
    parties.map(async (p_partie) => {
      const { data } = await supabase.rpc("compter_recherche", {
        q,
        p_vecteur: p_partie === "projets" ? p_vecteur : null,
        p_partie,
      });
      return ((data ?? [])[0] as DecompteRecherche | undefined) ?? vide;
    }),
  );
  return {
    projets: Number(lignes[0].projets),
    talents: Number(lignes[1].talents),
    personnages: Number(lignes[2].personnages),
  };
}

export type MotNuage = { label: string; poids: number };

/**
 * L'aperçu du nuage pour la page d'accueil : des mots et leur poids
 * relatif, rien de plus. Pas d'effectif chiffré, aucun lien vers un
 * projet, et rien de cliquable — le nuage complet, les chiffres et la
 * recherche par mots-clés sont réservés aux adhérents.
 */
export async function nuagePublic(limite = 15): Promise<MotNuage[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("nuage_public", { p_limite: limite });
  return ((data ?? []) as { label_fr: string; poids: number }[]).map((m) => ({
    label: m.label_fr,
    poids: m.poids ?? 0,
  }));
}


/**
 * Qui a droit au nuage de mots-clés : tout membre connecté (décision de
 * Sarah du 30/09/2026 — le réserver aux adhérents était « une vieille
 * idée », et elle n'était pas bonne). Le nom de la fonction est gardé
 * pour la page.
 */
export async function peutVoirLeNuage(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

export type TalentTrouve = {
  id: string;
  nom: string;
  photo: string | null;
  metiers: string[];
  ville: string | null;
  /** Nom retiré et photo floutée : tout le monde sauf l'administration (02/10). */
  masque: boolean;
};

/** Les talents (29/09) : jamais les lecteurs, filtrés par la base. */
export async function rechercherTalents(
  requete: string,
  page = 1,
): Promise<{ talents: TalentTrouve[]; total: number }> {
  const q = requete.trim();
  if (!q) return { talents: [], total: 0 };

  const supabase = await createClient();
  // Tous les mots doivent se trouver chez le talent, sans recherche par le
  // sens (05/11, Sarah, migration 0237).
  const premier = await supabase.rpc("rechercher_talents", { q, p_limite: LIMITE * page });
  let trouves = premier.data;
  // Trop lente (plus de 8 secondes) : la recherche par le nom seul prend le
  // relais, pour qu'un talent cherché par son prénom sorte toujours
  // (« sadaf », 05/11).
  if (premier.error) {
    console.error("rechercher_talents :", premier.error.message);
    ({ data: trouves } = await supabase.rpc("rechercher_talents_par_nom", { q, p_limite: LIMITE * page }));
  }
  const lignes = (trouves ?? []) as { id: string; total: number; metiers: string[] }[];
  const total = Number(lignes[0]?.total ?? 0);
  const fiches = await fichesTalents(supabase, lignes.slice((page - 1) * LIMITE, page * LIMITE));
  return { talents: fiches.talents, total };
}

/**
 * La Galaxie de Talents sans mot cherché (02/10) : tous les talents que la
 * recherche peut montrer, ceux qui ont une photo d'abord.
 */
export async function talentsDeLaGalaxie(
  page: number,
  parPage: number,
): Promise<{ talents: TalentTrouve[]; total: number }> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("galaxie_talents", {
    p_limite: parPage,
    p_decalage: (Math.max(1, page) - 1) * parPage,
  });
  return fichesTalents(supabase, (data ?? []) as { id: string; total: number; metiers: string[] }[]);
}

/** Les fiches (nom, photo, métiers, ville) des talents trouvés, dans l'ordre reçu. */
async function fichesTalents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lignes: { id: string; total: number; metiers: string[] }[],
): Promise<{ talents: TalentTrouve[]; total: number }> {
  if (lignes.length === 0) return { talents: [], total: 0 };

  // Décision de Sarah (02/10) : dans la Galaxie de Talents, les noms ne
  // sont pas visibles et les photos sont floutées. Le nom n'est pas envoyé
  // du tout au navigateur ; seule l'administration voit tout.
  const { data: estAdmin } = await supabase.rpc("is_admin");
  const masque = estAdmin !== true;

  const { data: profils } = await clientProfils(supabase)
    .from("profiles")
    .select("id, full_name, display_name, avatar_url, city")
    .in("id", lignes.map((l) => l.id))
    .returns<
      { id: string; full_name: string | null; display_name: string | null; avatar_url: string | null; city: string | null }[]
    >();
  const parId = new Map((profils ?? []).map((p) => [p.id, p]));

  const talents = lignes.flatMap((l) => {
    const p = parId.get(l.id);
    if (!p) return [];
    return [{
      id: p.id,
      nom: masque ? "" : (p.display_name ?? p.full_name ?? "Membre"),
      // Masqué : jamais l'adresse de la photo d'origine, seulement celle
      // de la copie floutée (« v » la renouvelle quand la photo change).
      photo:
        masque && p.avatar_url
          ? `/api/talents/photo?id=${p.id}&v=${createHash("sha256").update(p.avatar_url).digest("hex").slice(0, 8)}`
          : photoNette(p.avatar_url),
      masque,
      metiers: l.metiers ?? [],
      ville: p.city,
    }];
  });
  return { talents, total: Number(lignes[0]?.total ?? 0) };
}

export type PersonnageTrouve = {
  id: string;
  nom: string;
  portrait: string | null;
  /** Le cadrage du portrait : « x% y% » (object-position). */
  cadrage: string;
  comedien: string | null;
  projetId: string;
  /** « Femme · Adulte » (12/11, Sarah : ce dont un comédien a besoin ; le titre du projet n'est plus envoyé). */
  sexeEtAge: string;
};

/** Les personnages des projets de la Carte des étoiles (29/09). */
export async function rechercherPersonnages(
  requete: string,
  page = 1,
): Promise<{ personnages: PersonnageTrouve[]; total: number }> {
  const q = requete.trim();
  if (!q) return { personnages: [], total: 0 };

  const supabase = await createClient();
  const { data: trouves } = await supabase.rpc("rechercher_personnages", { q, p_limite: LIMITE * page });
  const lignes = (trouves ?? []) as { id: string; total: number }[];
  return fichesPersonnages(supabase, lignes.slice((page - 1) * LIMITE, page * LIMITE));
}

/**
 * La Galaxie de Personnages sans mot cherché (02/10) : tous les personnages
 * des projets de la Carte des étoiles, ceux qui ont un portrait d'abord.
 */
export async function personnagesDeLaGalaxie(
  page: number,
  parPage: number,
): Promise<{ personnages: PersonnageTrouve[]; total: number }> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("galaxie_personnages", {
    p_limite: parPage,
    p_decalage: (Math.max(1, page) - 1) * parPage,
  });
  return fichesPersonnages(supabase, (data ?? []) as { id: string; total: number }[]);
}

/** Les fiches (nom, portrait signé, projet) des personnages trouvés, dans l'ordre reçu. */
async function fichesPersonnages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lignes: { id: string; total: number }[],
): Promise<{ personnages: PersonnageTrouve[]; total: number }> {
  if (lignes.length === 0) return { personnages: [], total: 0 };

  const { data: fiches } = await clientCartes(supabase)
    .from("characters")
    .select("id, name, photo_path, photo_x, photo_y, actor_name, gender, age_range, project:projects!inner(id, is_public)")
    .eq("project.is_public", true)
    .in("id", lignes.map((l) => l.id))
    .returns<
      {
        id: string;
        name: string;
        photo_path: string | null;
        photo_x: number;
        photo_y: number;
        actor_name: string | null;
        gender: string | null;
        age_range: string | null;
        project: { id: string } | null;
      }[]
    >();

  const chemins = (fiches ?? []).map((f) => f.photo_path).filter((c): c is string => Boolean(c));
  const { data: signes } = chemins.length
    ? await supabase.storage.from("project-media").createSignedUrls(chemins, 60 * 60)
    : { data: [] };
  const urlDe = new Map((signes ?? []).map((s) => [s.path, s.signedUrl]));
  const parId = new Map((fiches ?? []).map((f) => [f.id, f]));

  const personnages = lignes.flatMap((l) => {
    const f = parId.get(l.id);
    if (!f || !f.project) return [];
    return [{
      id: f.id,
      nom: f.name,
      portrait: f.photo_path ? (urlDe.get(f.photo_path) ?? null) : null,
      cadrage: `${f.photo_x}% ${f.photo_y}%`,
      comedien: f.actor_name,
      projetId: f.project.id,
      sexeEtAge: sexeEtAge(f.gender, f.age_range),
    }];
  });
  return { personnages, total: Number(lignes[0]?.total ?? 0) };
}

export type Categorie = "projets" | "talents" | "personnages";

/**
 * La catégorie en tête de la recherche, selon le métier (29/09, décision
 * de Sarah) : les comédiens cherchent d'abord un personnage, tous les
 * autres un projet. Seul le métier principal compte.
 */
export async function categorieDeDepart(): Promise<Categorie> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "projets";
  const { data } = await supabase.rpc("metiers_du_membre", { uid: user.id });
  const metiers = (data ?? []) as string[];
  // Le métier principal seul : un réalisateur qui joue aussi garde les projets.
  return metiers[0] === "comedien" ? "personnages" : "projets";
}

/**
 * Le lot suivant de cartes des Galaxies, pour le bouton « Voir d'autres
 * projets » (12/11/2026) : mêmes règles que la page (membre connecté, titre
 * réservé aux adhérents), rendues par le serveur.
 */
export async function autresProjets(page: number, filtres: Filtres): Promise<ReactNode> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const propre = Object.fromEntries(
    Object.keys(AUCUN).map((cle) => {
      const v = (filtres as Record<string, unknown>)?.[cle];
      return [cle, typeof v === "string" && v.trim() ? v.trim() : null];
    }),
  ) as Filtres;
  const { cartes } = await lotDeCartes(supabase, user.id, Math.max(1, Math.floor(Number(page)) || 1), propre);
  return cartes;
}

/** Le lot suivant de personnages, pour le bouton « Voir d'autres personnages » (12/11/2026). */
export async function autresPersonnages(page: number): Promise<ReactNode> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { personnages } = await personnagesDeLaGalaxie(Math.max(1, Math.floor(Number(page)) || 1), PERSONNAGES_PAR_PAGE);
  return cartesPersonnages(personnages);
}
