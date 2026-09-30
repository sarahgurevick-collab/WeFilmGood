-- Quelques verbes courants de plus parmi les mots ignorés de la recherche
-- (30/09/2026) : « mère qui cache un secret » comptait « cache » comme un
-- critère (cache-cache, cachette…), que personne ne cochait → 0 résultat.
create or replace function public.mots_de_recherche(q text)
returns setof text
language sql
immutable
set search_path = public, extensions
as $$
  select distinct w
  from regexp_split_to_table(lower(public.sans_accent(coalesce(q, ''))), '[^a-z0-9]+') w
  where length(w) >= 3
    and w not in ('qui', 'que', 'quoi', 'sait', 'sais', 'savoir', 'peut', 'aime', 'avec', 'sans',
                  'pour', 'dans', 'sur', 'par', 'des', 'les', 'une', 'aux', 'est', 'sont', 'ont',
                  'jouer', 'joue', 'faire', 'fait', 'parle', 'parler', 'parlant', 'bien', 'tres',
                  'aussi', 'comme', 'mais', 'plus', 'cherche', 'recherche', 'besoin', 'veut', 'veulent',
                  'son', 'ses', 'leur', 'leurs', 'connait', 'connaissant', 'connaitre',
                  'cache', 'cacher', 'cachant', 'devient', 'devenir', 'decouvre', 'decouvrir',
                  'vit', 'vivre', 'tombe', 'tomber', 'entre', 'apres', 'avant', 'chez', 'depuis',
                  'ans', 'annees', 'jeune', 'vieux', 'vieille', 'petit', 'petite', 'grand', 'grande',
                  'homme', 'femme', 'personnage', 'role', 'histoire');
$$;
