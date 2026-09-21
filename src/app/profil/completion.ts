import type { SupabaseClient } from "@supabase/supabase-js";

export type Bloc = "identite" | "parcours" | "gouts";

export const BLOCS: { cle: Bloc; numero: number; titre: string; resume: string; duree: string }[] = [
  {
    cle: "identite",
    numero: 1,
    titre: "Qui êtes-vous ?",
    resume: "Auteur, producteur ou talent · votre référence professionnelle (producteurs et talents) · langues parlées · votre ville et votre pays.",
    duree: "2 minutes · nécessaire pour déposer un projet",
  },
  {
    cle: "parcours",
    numero: 2,
    titre: "Votre parcours",
    resume:
      "Biofilmographie · vos métiers · votre référence professionnelle · votre agent.",
    duree: "3 minutes · facultatif",
  },
  {
    cle: "gouts",
    numero: 3,
    titre: "Mieux vous connaître",
    resume: "Genres de prédilection.",
    duree: "1 minute · facultatif",
  },
];

export type Completion = {
  pourcent: number;
  fait: Record<Bloc, boolean>;
  profil: {
    full_name: string | null;
    first_name: string | null;
    category: string | null;
    validation_status: string | null;
  } | null;
};

/**
 * Où en est le profil. Huit repères comptent pour la jauge : catégorie,
 * ville, pays, biofilmographie, référence, au moins un métier, au moins
 * une langue, au moins un genre. Le témoignage n'y entre pas — retiré du
 * parcours de complétion, à réintégrer plus tard ailleurs sur le site.
 */
export async function calculerCompletion(
  supabase: SupabaseClient,
  userId: string,
): Promise<Completion> {
  const [{ data: profil }, { count: metiers }, { count: langues }, { count: genres }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, first_name, category, validation_status, city, country, biofilmo, website")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("profile_roles")
        .select("role_slug", { count: "exact", head: true })
        .eq("profile_id", userId)
        .neq("role_slug", "lecteur"),
      supabase
        .from("profile_languages")
        .select("language_code", { count: "exact", head: true })
        .eq("profile_id", userId),
      supabase
        .from("profile_genres")
        .select("genre_slug", { count: "exact", head: true })
        .eq("profile_id", userId),
    ]);

  const reperes = [
    !!profil?.category,
    !!profil?.city,
    !!profil?.country,
    !!profil?.biofilmo,
    !!profil?.website,
    (metiers ?? 0) > 0,
    (langues ?? 0) > 0,
    (genres ?? 0) > 0,
  ];
  const pourcent = Math.round((reperes.filter(Boolean).length / reperes.length) * 100);

  return {
    pourcent,
    fait: {
      identite: !!profil?.category,
      parcours: !!profil?.biofilmo || !!profil?.website || (metiers ?? 0) > 0,
      gouts: (genres ?? 0) > 0,
    },
    profil: profil
      ? {
          full_name: profil.full_name,
          first_name: profil.first_name,
          category: profil.category,
          validation_status: profil.validation_status,
        }
      : null,
  };
}
