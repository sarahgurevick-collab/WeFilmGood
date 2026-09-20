-- =====================================================================
-- Finder : corrige deux défauts remontés en test.
--
-- 1. En cas d'égalité parfaite entre plusieurs projets (score 1.0), l'ordre
--    n'était pas défini : on ajoute le plus récent en premier comme
--    critère de départage, pour un ordre stable et reproductible.
-- 2. Rien n'indiquait qu'il y avait plus de résultats que la limite
--    affichée (ex. "drame" correspond à 1656 projets, seuls 60
--    remontaient sans le dire) : la fonction renvoie maintenant le
--    nombre total de correspondances, pour que l'interface puisse
--    afficher "1656 résultats, 60 affichés".
-- =====================================================================

-- Postgres refuse de changer la forme des colonnes de sortie d'une
-- fonction existante avec "create or replace" : il faut d'abord la
-- supprimer (0026 l'avait créée avec seulement id, score).
drop function if exists public.rechercher_projets(text, int);

create function public.rechercher_projets(q text, p_limite int default 60)
returns table (id uuid, score real, total bigint)
language sql
stable
as $$
  select id, score, count(*) over () as total
  from (
    select p.id, p.created_at,
      greatest(
        coalesce(similarity(p.title, q), 0),
        coalesce(similarity(p.logline, q), 0),
        coalesce((
          select max(similarity(k.label_fr, q))
          from public.project_keywords pk
          join public.keywords k on k.id = pk.keyword_id
          where pk.project_id = p.id
        ), 0)
      ) as score
    from public.projects p
    where p.is_public
      and (
        p.title % q
        or p.logline % q
        or exists (
          select 1
          from public.project_keywords pk
          join public.keywords k on k.id = pk.keyword_id
          where pk.project_id = p.id and k.label_fr % q
        )
      )
  ) tous
  order by score desc, created_at desc
  limit p_limite;
$$;

grant execute on function public.rechercher_projets(text, int) to anon, authenticated;
