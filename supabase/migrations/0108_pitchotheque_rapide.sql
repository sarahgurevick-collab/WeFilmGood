-- La pitchothèque était en échec (« statement timeout » de 8 s) : la
-- page retombait sur son affichage de secours, qui montrait aussi les
-- projets sans vignette (dont le projet de test).
--
-- Deux causes, corrigées ici :
--  1. écrite en SQL pur, la fonction ne connaissait pas la valeur des
--     filtres au moment de choisir son plan : les sous-requêtes des
--     filtres étaient rejouées pour chacun des 5 313 projets (6 s). En
--     plpgsql avec un plan refait à chaque appel, les filtres vides
--     disparaissent du calcul (quelques millisecondes) ;
--  2. elle passait par les règles d'accès de chaque ligne de
--     project_files et characters. Elle ne renvoie que des identifiants de
--     projets déjà visibles des membres (is_public) : elle s'exécute donc
--     avec les droits de son propriétaire, mais refuse toujours un
--     visiteur sans compte.
create or replace function public.pitchotheque(p_limite integer default 60, p_decalage integer default 0, p_format text default null, p_genre text default null, p_audience text default null, p_budget text default null, p_bandeau text default null, p_equipe text default null, p_selection text default null, p_comedien text default null)
returns table(id uuid, total bigint)
language plpgsql
stable
security definer
set search_path to 'public'
set plan_cache_mode to 'force_custom_plan'
as $function$
#variable_conflict use_column
begin
  return query
with fichiers as (
    select
      f.project_id,
      bool_or(f.kind = 'vignette') as a_vignette,
      bool_or(f.kind = 'scenario') as a_scenario
    from public.project_files f
    group by f.project_id
  ),
  personnages as (
    select c.project_id, count(*) as nombre
    from public.characters c
    group by c.project_id
  ),
  notes as (
    select
      p.id,
      p.status = 'labellise' as labellise,
      p.bandeau is not null as a_bandeau,
      (coalesce(btrim(p.videopitch_fr), '') <> ''
       or coalesce(btrim(p.videopitch_en), '') <> ''
       or coalesce(btrim(p.trailer_url), '') <> '') as a_videopitch,
      round(
        (case when coalesce(btrim(p.logline), '') <> '' then 20 else 0 end
         + case when coalesce(btrim(p.synopsis), '') <> '' then 20 else 0 end
         + case when coalesce(f.a_vignette, false) then 20 else 0 end
         + case when coalesce(f.a_scenario, false) then 20 else 0 end
         + case when p.genre_slug is not null then 10 else 0 end
         + case when p.format is not null then 10 else 0 end
         + case when coalesce(pe.nombre, 0) > 0 then 10 else 0 end) * 100.0 / 110
      ) as remplissage
    from public.projects p
    left join fichiers f on f.project_id = p.id
    left join personnages pe on pe.project_id = p.id
    where p.is_public
       and auth.uid() is not null
      and exists (select 1 from public.project_files fv where fv.project_id = p.id and fv.kind = 'vignette')
      and (p_format is null or p.format::text = p_format)
      and (p_genre is null or p.genre_slug = p_genre)
      and (p_audience is null or p.target_audience = p_audience)
      and (p_budget is null or p.budget_range = p_budget)
      and (p_bandeau is null or (p_bandeau = 'tous' and p.bandeau is not null) or p.bandeau = p_bandeau)
      and (p_selection is null or exists (select 1 from public.project_selections s where s.project_id = p.id and s.libelle = p_selection))
      and (p_comedien is null or exists (select 1 from public.project_actors a where a.project_id = p.id and a.libelle = p_comedien))
      and (p_equipe is null or (coalesce(p.bandeau, '') not in ('tourne', 'film_prime')
           and exists (select 1 from public.project_co_authors ca
                      where ca.project_id = p.id and ca.status = 'accepte'
                        and (ca.role_slug = p_equipe
                             or (p_equipe = 'tous' and ca.role_slug in ('producteur', 'realisateur'))))))
  )
  ,
  classes as (
    select
      n.id,
      n.a_bandeau,
      case
        when n.a_bandeau or n.labellise then 0
        when n.a_videopitch then 1
        else 2
      end as famille,
      case
        when n.a_bandeau or n.labellise then 0
        when n.remplissage >= 50 then 1
        when n.remplissage >= 30 then 2
        else 3
      end as tranche,
      md5(n.id::text || ((now() at time zone 'Europe/Paris')::date)::text) as tirage
    from notes n
  ),
  -- Chaque nuit, vingt projets à bandeau tirés au sort sont semés dans
  -- les dix premières pages, deux par page ; les autres sont mêlés aux
  -- labellisés des pages suivantes (27/09/2026). Tous ont été labellisés.
  bandeaux as (
    select c.id, row_number() over (order by c.tirage) - 1 as r
    from classes c
    where c.a_bandeau
  ),
  places as (
    select
      c.*,
      -- place visée (page r/2, un en haut, un au milieu), moins les projets
      -- déjà semés avant lui, puisqu'ils ne comptent pas dans « rang ».
      case when b.r < 20 then (b.r / 2) * 50 + (b.r % 2) * 25 + 12 - b.r + 0.5 end as place_semee,
      row_number() over (
        partition by c.famille, c.tranche, c.a_bandeau, coalesce(b.r < 20, false)
        order by c.tirage
      ) as rang,
      count(*) over (
        partition by c.famille, c.tranche, c.a_bandeau, coalesce(b.r < 20, false)
      ) as effectif,
      count(*) filter (where not c.a_bandeau) over (partition by c.famille, c.tranche) as labellises
    from classes c
    left join bandeaux b on b.id = c.id
  )
  select
    p.id,
    count(*) over () as total
  from places p
  order by p.famille, p.tranche,
    -- les projets à bandeau non tirés ce jour-là passent après les
    -- labellisés : les dix premières pages en gardent deux, pas plus.
    -- les projets à bandeau non tirés ce jour-là sont mêlés aux autres
    -- labellisés, mais au-delà de la dixième page, qui garde ses deux.
    case
      when p.place_semee is not null then p.place_semee
      when p.a_bandeau then 480 + (p.rang::numeric / (p.effectif + 1)) * greatest(p.labellises - 480, 1)
      else p.rang
    end,
    p.tirage
  limit greatest(p_limite, 0)
  offset greatest(p_decalage, 0);
end;
$function$;

revoke all on function public.pitchotheque(integer, integer, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.pitchotheque(integer, integer, text, text, text, text, text, text, text, text) to authenticated, service_role;
