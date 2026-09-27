-- Recherche avancée (27/09/2026, demande de Sarah) : le filtre « Langue
-- du projet » est remplacé par le bandeau — retrouver les projets signés,
-- tournés ou primés (« tous » = n'importe lequel des bandeaux). Et le
-- bandeau « Optionné » disparaît : les projets qui l'auraient passent en
-- « Signé » (aucun à ce jour).
update public.projects set bandeau = 'signe' where bandeau = 'optionne';
alter table public.projects drop constraint if exists projects_bandeau_check;
alter table public.projects add constraint projects_bandeau_check
  check (bandeau in ('signe', 'tourne', 'script_prime', 'film_prime'));

drop function if exists public.pitchotheque(integer, integer, text, text, text, text, text);
drop function if exists public.rechercher_projets(text, integer, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.pitchotheque(p_limite integer DEFAULT 60, p_decalage integer DEFAULT 0, p_format text DEFAULT NULL::text, p_genre text DEFAULT NULL::text, p_audience text DEFAULT NULL::text, p_budget text DEFAULT NULL::text, p_bandeau text DEFAULT NULL::text)
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
      and (p_bandeau is null or (p_bandeau = 'tous' and p.bandeau is not null) or p.bandeau = p_bandeau)
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

CREATE OR REPLACE FUNCTION public.rechercher_projets(q text, p_limite integer DEFAULT 60, p_format text DEFAULT NULL::text, p_genre text DEFAULT NULL::text, p_audience text DEFAULT NULL::text, p_budget text DEFAULT NULL::text, p_bandeau text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, score real, total bigint)
 LANGUAGE sql
 STABLE
AS $function$
  with terme as (
    -- Le texte tapé sert de motif ilike : on neutralise %, _ et \, sinon
    -- un visiteur qui tape "100 %" ferait un joker qui remonte tout.
    select nullif(btrim(q), '') as mot,
           '%' || replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif
  ),
  -- Les mots-clés d'abord : ce sont eux qui décrivent le mieux un projet,
  -- ils dominent donc le classement.
  mots as (
    select k.id,
      case
        when lower(k.label_fr) = lower(t.mot) then 1.00  -- le mot-clé exact
        when k.label_fr ilike t.motif then 0.90          -- "road" dans "road trip"
        else 0.60                                        -- rattrapé par similarité (faute de frappe)
      end as score
    from public.keywords k, terme t
    where t.mot is not null
      and (k.label_fr ilike t.motif or similarity(k.label_fr, t.mot) >= 0.45)
  ),
  par_mot as (
    select pk.project_id, max(m.score) as score
    from public.project_keywords pk
    join mots m on m.id = pk.keyword_id
    group by pk.project_id
  ),
  par_texte as (
    select p.id as project_id,
      greatest(
        case when lower(p.title) = lower(t.mot) then 0.95
             when p.title ilike t.motif then 0.75 else 0 end,
        case when p.logline ilike t.motif then 0.50 else 0 end,
        case when p.synopsis ilike t.motif then 0.40 else 0 end
      ) as score
    from public.projects p, terme t
    where t.mot is not null
      and (p.title ilike t.motif or p.logline ilike t.motif or p.synopsis ilike t.motif)
  ),
  tous as (
    select project_id, max(score) as score
    from (select * from par_mot union all select * from par_texte) u
    group by project_id
  )
  select t.project_id, t.score::real, count(*) over () as total
  from tous t
  join public.projects p on p.id = t.project_id
  where p.is_public
    and exists (select 1 from public.project_files fv where fv.project_id = p.id and fv.kind = 'vignette')
    and (p_format is null or p.format::text = p_format)
    and (p_genre is null or p.genre_slug = p_genre)
    and (p_audience is null or p.target_audience = p_audience)
    and (p_budget is null or p.budget_range = p_budget)
    and (p_bandeau is null or (p_bandeau = 'tous' and p.bandeau is not null) or p.bandeau = p_bandeau)
  order by t.score desc, p.created_at desc
  limit p_limite;
$function$;

grant execute on function public.pitchotheque(integer, integer, text, text, text, text, text) to anon, authenticated;
grant execute on function public.rechercher_projets(text, integer, text, text, text, text, text) to anon, authenticated;
grant execute on function public.pitchotheque(integer, integer, text, text, text, text, text) to service_role;
grant execute on function public.rechercher_projets(text, integer, text, text, text, text, text) to service_role;
