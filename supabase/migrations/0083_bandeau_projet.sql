-- Le bandeau d'un projet (27/09/2026) : sur WFG 1, l'administration
-- posait sur la vignette d'un projet signé, tourné ou primé un bandeau en
-- travers (Optionné, Signé, Tourné, Script primé, Film primé), et ces
-- projets restaient dans la pitchothèque. On reprend le bandeau
-- (wfg1.projects.labeled : 1 à 5) et ces projets forment la première
-- famille de la pitchothèque, avant les labellisés, tirés au sort chaque
-- nuit comme les autres.
alter table public.projects
  add column if not exists bandeau text
  check (bandeau in ('optionne', 'signe', 'tourne', 'script_prime', 'film_prime'));

update public.projects p
   set bandeau = (array['optionne', 'signe', 'tourne', 'script_prime', 'film_prime'])[w.labeled]
  from wfg1.projects w
 where p.legacy_id = w.project_id::text
   and w.labeled between 1 and 5
   and p.bandeau is null;

CREATE OR REPLACE FUNCTION public.pitchotheque(p_limite integer DEFAULT 60, p_decalage integer DEFAULT 0, p_format text DEFAULT NULL::text, p_genre text DEFAULT NULL::text, p_audience text DEFAULT NULL::text, p_budget text DEFAULT NULL::text, p_langue text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, total bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
      and exists (select 1 from public.project_files fv where fv.project_id = p.id and fv.kind = 'vignette')
      and (p_format is null or p.format::text = p_format)
      and (p_genre is null or p.genre_slug = p_genre)
      and (p_audience is null or p.target_audience = p_audience)
      and (p_budget is null or p.budget_range = p_budget)
      and (p_langue is null or p.language = p_langue)
  )
  select
    n.id,
    count(*) over () as total
  from notes n
  order by
    case
      when n.a_bandeau then -1
      when n.labellise then 0
      when n.a_videopitch then 1
      else 2
    end,
    case
      when n.a_bandeau or n.labellise then 0
      when n.remplissage >= 50 then 1
      when n.remplissage >= 30 then 2
      else 3
    end,
    md5(n.id::text || ((now() at time zone 'Europe/Paris')::date)::text)
  limit greatest(p_limite, 0)
  offset greatest(p_decalage, 0);
$function$;
