-- =====================================================================
-- Le nuage de mots-clés doit varier avec la recherche tapée, pas rester
-- figé sur les mots-clés les plus populaires en général.
--
-- Contrairement à la recherche principale (opérateur `%`, avec un seuil
-- minimal), ici on classe TOUS les mots-clés utilisés par leur
-- similarité au texte tapé, sans seuil : "ami" doit quand même faire
-- remonter "amitié" en tête, même si l'écart de longueur les place sous
-- le seuil strict du `%`. Un scan de quelques centaines de mots-clés
-- distincts est sans coût mesurable.
-- =====================================================================

create or replace function public.mots_cles_proches(q text, p_limite int default 30)
returns table (label_fr text, effectif bigint, score real)
language sql
stable
as $$
  select k.label_fr, count(*) as effectif, max(similarity(k.label_fr, q)) as score
  from public.keywords k
  join public.project_keywords pk on pk.keyword_id = k.id
  join public.projects p on p.id = pk.project_id
  where p.is_public
  group by k.label_fr
  order by score desc, effectif desc
  limit p_limite;
$$;

grant execute on function public.mots_cles_proches(text, int) to anon, authenticated;
