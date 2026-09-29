import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type NoeudOrbite = {
  id: string;
  nom: string;
  /** « Personnage » ou le métier du talent. */
  etiquette: string;
  image: string;
  bio: string;
  /** Profil du talent ; absent pour un personnage. */
  lien?: string;
};

export type ProjetOrbite = {
  id: string;
  titre: string;
  genre: string | null;
  logline: string;
  personnages: NoeudOrbite[];
  equipe: NoeudOrbite[];
};

type Brut = {
  id: string;
  titre: string;
  genre: string | null;
  logline: string;
  personnages: { nom: string; age: string | null; photo: string; bio: string }[];
  equipe: { id: string; nom: string; role: string; avatar: string; bio: string }[];
};

/**
 * Le projet de l'orbite d'accueil, tiré au hasard à chaque visite.
 *
 * Passe par le client à privilèges : les projets ne sont pas lisibles
 * sans compte. À revoir avant la bascule (voir la migration 0107) : ne
 * tirer que les projets dont les auteurs ont donné leur accord.
 */
export async function chargerProjetOrbite(): Promise<ProjetOrbite | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data, error } = await admin.rpc("projet_orbite");
  if (error || !data) return null;
  const brut = data as Brut;

  const chemins = brut.personnages.map((p) => p.photo);
  const { data: signees } = chemins.length
    ? await admin.storage.from("project-media").createSignedUrls(chemins, 60 * 60)
    : { data: [] };
  const url = new Map((signees ?? []).map((s) => [s.path, s.signedUrl]));

  const personnages = brut.personnages
    .map((p, i) => ({
      id: `p${i}`,
      nom: p.nom,
      etiquette: "Personnage",
      image: url.get(p.photo) ?? "",
      bio: p.bio,
    }))
    .filter((p) => p.image);

  return {
    id: brut.id,
    titre: brut.titre,
    genre: brut.genre,
    logline: brut.logline,
    personnages,
    equipe: brut.equipe.slice(0, 4).map((m) => ({
      id: m.id,
      nom: m.nom,
      etiquette: m.role,
      image: m.avatar,
      bio: m.bio,
      lien: `/membres/${m.id}`,
    })),
  };
}
