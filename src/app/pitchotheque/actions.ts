"use server";

import { createClient } from "@/lib/supabase/server";
import { AUCUN, parametresRpc, type Filtres } from "./filtres";
import { enTexte, vecteur } from "@/lib/vecteurs";

export type ProjetTrouve = {
  id: string;
  title: string;
  logline: string | null;
  status: string;
  bandeau: string | null;
  genre: { label_fr: string } | null;
  vignette: string | null;
};

export type ResultatRecherche = {
  projets: ProjetTrouve[];
  total: number;
  /** Les mots-clés voisins par le sens qui ont fourni des projets
      (« sardine » → poisson, pêche…), quand les lettres n'ont pas suffi. */
  parLeSens?: string[];
};

// En dessous, la recherche par les lettres est complétée par le sens.
const PEU_DE_RESULTATS = 8;
// Un mot-clé compte comme voisin de sens à partir de cette proximité (0 à 1).
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
  const { data } = await supabase.rpc("mots_cles_par_sens", { p_vecteur: enTexte(v), p_limite: 12 });
  const proches = ((data ?? []) as { keyword_id: number; label_fr: string; effectif: number; proximite: number }[])
    .filter((m) => m.proximite >= PROXIMITE_MINIMALE && m.effectif > 0 && m.label_fr.toLowerCase() !== q.toLowerCase());
  if (proches.length === 0) return { ids: [], mots: [] };

  const ids: string[] = [];
  const mots: string[] = [];
  for (const m of proches) {
    if (ids.length >= limite) break;
    // Les mêmes filtres que la recherche par les lettres.
    const { data: trouves } = await supabase.rpc("rechercher_projets", {
      q: m.label_fr,
      p_limite: limite,
      ...parametresRpc(filtres),
    });
    let ajoutes = 0;
    for (const t of (trouves ?? []) as { id: string }[]) {
      if (dejaTrouves.has(t.id) || ids.length >= limite) continue;
      dejaTrouves.add(t.id);
      ids.push(t.id);
      ajoutes++;
    }
    if (ajoutes > 0) mots.push(m.label_fr);
  }

  // Puis le texte même des fiches (0097) : un projet qui parle de
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

const LIMITE = 60;

export async function rechercherProjets(
  requete: string,
  filtres: Filtres = AUCUN,
): Promise<ResultatRecherche> {
  const q = requete.trim();
  if (!q) return { projets: [], total: 0 };

  const supabase = await createClient();

  // Les filtres de la recherche avancée s'ajoutent au mot cherché.
  const { data: trouves } = await supabase.rpc("rechercher_projets", {
    q,
    p_limite: LIMITE,
    ...parametresRpc(filtres),
  });

  const lignes = (trouves ?? []) as { id: string; score: number; total: number }[];
  const ids: string[] = lignes.map((t) => t.id);
  let total = lignes[0]?.total ?? 0;

  // Peu de résultats par les lettres : on complète par le sens.
  let parLeSens: string[] | undefined;
  if (ids.length < PEU_DE_RESULTATS) {
    const sens = await projetsParLeSens(q, filtres, new Set(ids), LIMITE - ids.length);
    if (sens.ids.length) {
      ids.push(...sens.ids);
      total += sens.ids.length;
      parLeSens = sens.mots;
    }
  }
  if (ids.length === 0) return { projets: [], total: 0 };

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, title, logline, status, bandeau, genre:genres(label_fr), files:project_files(storage_path, kind)",
    )
    .in("id", ids)
    .returns<
      {
        id: string;
        title: string;
        logline: string | null;
        status: string;
        bandeau: string | null;
        genre: { label_fr: string } | null;
        files: { storage_path: string; kind: string }[];
      }[]
    >();

  const chemins = (projects ?? [])
    .map((p) => (p.files ?? []).find((f) => f.kind === "vignette")?.storage_path)
    .filter((c): c is string => Boolean(c));

  const { data: signes } = chemins.length
    ? await supabase.storage.from("project-media").createSignedUrls(chemins, 60 * 60)
    : { data: [] };

  const urlDe = new Map((signes ?? []).map((s) => [s.path, s.signedUrl]));
  const ordreDe = new Map<string, number>(ids.map((id, i) => [id, i]));

  const projets = (projects ?? [])
    .map((p) => {
      const chemin = (p.files ?? []).find((f) => f.kind === "vignette")?.storage_path;
      return {
        id: p.id,
        title: p.title,
        logline: p.logline,
        status: p.status,
        bandeau: p.bandeau,
        genre: p.genre,
        vignette: chemin ? (urlDe.get(chemin) ?? null) : null,
      };
    })
    .sort((a, b) => (ordreDe.get(a.id) ?? 0) - (ordreDe.get(b.id) ?? 0));

  return { projets, total, parLeSens };
}

export type MotCle = { label: string; effectif: number };

/** Sans recherche en cours : les mots-clés les plus utilisés, pour explorer. */
export async function nuageMotsCles(limite = 80): Promise<MotCle[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("nuage_mots_cles", { p_limite: limite });
  const lignes = (data ?? []) as { label_fr: string; effectif: number }[];
  return lignes.map((l) => ({ label: l.label_fr, effectif: l.effectif }));
}

/** Avec une recherche en cours : les mots-clés existants les plus proches de ce qui est tapé. */
export async function motsClesProches(requete: string, limite = 80): Promise<MotCle[]> {
  const q = requete.trim();
  if (!q) return nuageMotsCles(limite);

  const supabase = await createClient();
  const { data } = await supabase.rpc("mots_cles_proches", { q, p_limite: limite });
  const lignes = (data ?? []) as { label_fr: string; effectif: number; score: number }[];
  const mots = lignes.map((l) => ({ label: l.label_fr, effectif: l.effectif }));

  // Le nuage se complète par le sens (27/09) : autour de « sardine »,
  // poisson, pêche, mer… même sans lettre commune.
  if (mots.length < limite) {
    const v = await vecteur(q);
    if (v) {
      const { data: sens } = await supabase.rpc("mots_cles_par_sens", { p_vecteur: enTexte(v), p_limite: limite });
      const deja = new Set(mots.map((m) => m.label));
      for (const m of (sens ?? []) as { label_fr: string; effectif: number; proximite: number }[]) {
        if (mots.length >= limite) break;
        if (m.proximite < PROXIMITE_MINIMALE || m.effectif === 0 || deja.has(m.label_fr)) continue;
        deja.add(m.label_fr);
        mots.push({ label: m.label_fr, effectif: m.effectif });
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

  const supabase = await createClient();
  const { data } = await supabase.rpc("compter_recherche", { q });
  const ligne = (data ?? [])[0] as DecompteRecherche | undefined;
  return ligne ?? vide;
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
};

/** Les talents (29/09) : jamais les lecteurs, filtrés par la base. */
export async function rechercherTalents(
  requete: string,
): Promise<{ talents: TalentTrouve[]; total: number }> {
  const q = requete.trim();
  if (!q) return { talents: [], total: 0 };

  const supabase = await createClient();
  const { data: trouves } = await supabase.rpc("rechercher_talents", { q, p_limite: LIMITE });
  const lignes = (trouves ?? []) as { id: string; total: number; metiers: string[] }[];
  if (lignes.length === 0) return { talents: [], total: 0 };

  const { data: profils } = await supabase
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
      nom: p.display_name ?? p.full_name ?? "Membre",
      photo: p.avatar_url,
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
  comedien: string | null;
  projetId: string;
  projet: string;
};

/** Les personnages des projets de la Carte des étoiles (29/09). */
export async function rechercherPersonnages(
  requete: string,
): Promise<{ personnages: PersonnageTrouve[]; total: number }> {
  const q = requete.trim();
  if (!q) return { personnages: [], total: 0 };

  const supabase = await createClient();
  const { data: trouves } = await supabase.rpc("rechercher_personnages", { q, p_limite: LIMITE });
  const lignes = (trouves ?? []) as { id: string; total: number }[];
  if (lignes.length === 0) return { personnages: [], total: 0 };

  const { data: fiches } = await supabase
    .from("characters")
    .select("id, name, photo_path, actor_name, project:projects(id, title)")
    .in("id", lignes.map((l) => l.id))
    .returns<
      {
        id: string;
        name: string;
        photo_path: string | null;
        actor_name: string | null;
        project: { id: string; title: string } | null;
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
      comedien: f.actor_name,
      projetId: f.project.id,
      projet: f.project.title,
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
