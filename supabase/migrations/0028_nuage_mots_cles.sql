-- =====================================================================
-- Nuage de mots-clés : les mots-clés les plus utilisés parmi les
-- projets publics, avec leur nombre d'occurrences. Sert de bouton
-- d'aide dans le Finder quand une recherche ne donne rien (ex. "ami"
-- ou "passion", trop courts ou absents tels quels du vocabulaire
-- généré librement par l'IA) : la personne pioche un mot existant
-- plutôt que de deviner.
--
-- Zéro coût : uniquement un comptage sur des données déjà en base.
-- =====================================================================

create or replace function public.nuage_mots_cles(p_limite int default 80)
returns table (label_fr text, effectif bigint)
language sql
stable
as $$
  select k.label_fr, count(*) as effectif
  from public.keywords k
  join public.project_keywords pk on pk.keyword_id = k.id
  join public.projects p on p.id = pk.project_id
  where p.is_public
  group by k.label_fr
  order by effectif desc, k.label_fr asc
  limit p_limite;
$$;

grant execute on function public.nuage_mots_cles(int) to anon, authenticated;
