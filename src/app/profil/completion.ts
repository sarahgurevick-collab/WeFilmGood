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
      "Biofilmographie · vos autres compétences · vos genres de prédilection · votre agent · vos réseaux.",
    duree: "3 minutes · facultatif",
  },
  {
    cle: "gouts",
    numero: 3,
    titre: "Mieux vous connaître",
    resume: "Votre portrait chinois : vingt questions « si j'étais… ».",
    duree: "5 minutes · facultatif",
  },
];

export type Completion = {
  pourcent: number;
  pourcentBloc: Record<Bloc, number>;
  fait: Record<Bloc, boolean>;
  profil: {
    full_name: string | null;
    first_name: string | null;
    category: string | null;
    validation_status: string | null;
  } | null;
};

const arrondi = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

/**
 * Où en est le profil. `pourcent` reste la jauge globale du sommaire
 * (neuf repères) ; `pourcentBloc` détaille chaque bloc pour le pourcentage
 * affiché à côté de son titre — la réponse à « c'est bien rempli ? » du
 * bloc qu'on a sous les yeux, pas du profil entier.
 *
 *  - qui êtes-vous : catégorie, ville, pays, au moins une langue, et la
 *    référence professionnelle — seulement pour un producteur ou un
 *    autre talent, à qui elle est demandée ;
 *  - votre parcours : biofilmographie, au moins un métier, au moins un
 *    genre, un agent, au moins un réseau social ;
 *  - mieux vous connaître : le portrait chinois, question par question,
 *    sur le nombre réel de questions posées.
 */
export async function calculerCompletion(
  supabase: SupabaseClient,
  userId: string,
): Promise<Completion> {
  const [
    { data: profil },
    { count: metiers },
    { count: langues },
    { count: genres },
    { count: reseaux },
    { count: questionsPortrait },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, first_name, category, validation_status, city, country, biofilmo, website, agent_name, personality_answers",
      )
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
    supabase
      .from("profile_social_links")
      .select("network", { count: "exact", head: true })
      .eq("profile_id", userId),
    supabase.from("personality_questions").select("key", { count: "exact", head: true }),
  ]);

  const portrait = Object.keys((profil?.personality_answers as object | null) ?? {}).length;
  const totalQuestions = questionsPortrait ?? 20;

  const reperes = [
    !!profil?.category,
    !!profil?.city,
    !!profil?.country,
    !!profil?.biofilmo,
    !!profil?.website,
    (metiers ?? 0) > 0,
    (langues ?? 0) > 0,
    (genres ?? 0) > 0,
    portrait >= 10,
  ];
  const pourcent = Math.round((reperes.filter(Boolean).length / reperes.length) * 100);

  // La référence professionnelle ne compte que pour un producteur ou un
  // autre talent : un auteur n'a rien à prouver, et ne devrait jamais
  // plafonner à 80 % faute d'un champ qui ne le concerne pas.
  const doitProuver = profil?.category === "producteur" || profil?.category === "talent";
  const criteresIdentite = [
    !!profil?.category,
    !!profil?.city,
    !!profil?.country,
    (langues ?? 0) > 0,
    ...(doitProuver ? [!!profil?.website] : []),
  ];

  const criteresParcours = [
    !!profil?.biofilmo,
    (metiers ?? 0) > 0,
    (genres ?? 0) > 0,
    !!profil?.agent_name,
    (reseaux ?? 0) > 0,
  ];

  return {
    pourcent,
    pourcentBloc: {
      identite: arrondi(criteresIdentite.filter(Boolean).length, criteresIdentite.length),
      parcours: arrondi(criteresParcours.filter(Boolean).length, criteresParcours.length),
      gouts: arrondi(portrait, totalQuestions),
    },
    fait: {
      identite: !!profil?.category,
      parcours: !!profil?.biofilmo || !!profil?.website || (metiers ?? 0) > 0 || (genres ?? 0) > 0,
      gouts: portrait > 0,
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
