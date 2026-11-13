-- 13/11/2026, Sarah : « prendre en compte un pluriel dès qu'un auteur
-- demande un singulier, pour avoir le gros chiffre ». Le complément par le
-- sens reçoit les vecteurs du mot et de son autre nombre (« zombie » et
-- « zombies ») : les deux donnent le même total, le plus grand. Le plafond
-- de 300 fiches par le sens reste celui des Galaxies.
drop function if exists public.compter_recherche(text, text, text);
create or replace function public.compter_recherche(q text, p_vecteurs text[] default null, p_partie text default null)
returns table(projets bigint, talents bigint, personnages bigint)
language sql stable security definer
set search_path to 'public', 'extensions'
as $$
  with lettres as materialized (
    select r.id, r.total from public.rechercher_projets(q, 1000) r
  ),
  total_lettres as materialized (
    select coalesce((select max(total) from lettres), 0) as n
  ),
  sens as (
    select least(count(distinct s.id), 300) as n
    from unnest(p_vecteurs) v(t)
    cross join lateral public.projets_par_sens(v.t::extensions.vector, 300) s
    where s.proximite >= 0.4
      and s.id not in (select id from lettres)
      and (select n from total_lettres) <= 1000
  )
  select
    case when nullif(btrim(q), '') is null or coalesce(p_partie, 'projets') <> 'projets' then 0
         else (select n from total_lettres) + (select n from sens) end,
    case when coalesce(p_partie, 'talents') <> 'talents' then 0
         else coalesce((select t.total from public.rechercher_talents_interne(q, 1) t), 0) end,
    case when coalesce(p_partie, 'personnages') <> 'personnages' then 0
         else coalesce((select c.total from public.rechercher_personnages_interne(q, 1) c), 0) end;
$$;
revoke all on function public.compter_recherche(text, text[], text) from public;
grant execute on function public.compter_recherche(text, text[], text) to anon, authenticated, service_role;
