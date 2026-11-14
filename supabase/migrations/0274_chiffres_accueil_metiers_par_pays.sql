-- 14/11/2026, Sarah : « Ma fille a compris qu'il n'y avait que des
-- scénaristes sur le globe. Peux-tu adapter les couleurs aux profils des
-- talents ? » Les chiffres de l'accueil donnent en plus, pour chaque pays,
-- le nombre de talents par métier (pays_metiers) : le globe pose un point
-- par métier, à la couleur de l'anneau. Le reste ne change pas (0272).
create or replace function public.chiffres_accueil()
returns jsonb
language sql stable security definer
set search_path to 'public'
as $$
  with c as materialized (
    select p.id,
           coalesce(
             nullif(upper(btrim(p.country)), ''),
             (select case f.fin when 'UK' then 'GB' else f.fin end
              from (select upper(substring(lower(u.email) from '\.([a-z]{2})$')) as fin
                    from auth.users u where u.id = p.id) f
              where f.fin is not null
                and f.fin not in ('CO', 'ME', 'IO', 'TV', 'FM', 'AI', 'CC', 'EU', 'TO', 'WS', 'LY', 'GG', 'NU'))
           ) as pays
    from public.profiles p
    where p.anonymized_at is null
      and p.departed_at is null
      and not exists (select 1 from public.profile_roles l where l.profile_id = p.id and l.role_slug = 'lecteur')
      and not exists (select 1 from wfg1.accounts a where a.user_id::text = p.legacy_id and a.role = 'reader')
      and coalesce(p.category::text, '') <> 'cinephile'
  ),
  cm as materialized (
    select c.pays, x.slug
    from c cross join lateral unnest(public.metiers_du_membre(c.id)) x(slug)
  ),
  m as (
    select slug, count(*) as n from cm group by slug
  ),
  pm as (
    select pays, jsonb_object_agg(slug, n) as detail
    from (select pays, slug, count(*) as n from cm where pays is not null group by pays, slug) d
    group by pays
  )
  select jsonb_build_object(
    'talents', (select count(*) from c),
    'metiers', (select coalesce(jsonb_object_agg(slug, n), '{}'::jsonb) from m),
    'fiches', (select count(*) from public.legacy_reading_reports)
              + (select count(*) from public.archives_fiches_lecture)
              + (select count(*) from public.reading_reports),
    'labellises', (select count(distinct project_id) from public.legacy_reading_reports where final_mark >= 151),
    'pays', (select count(distinct pays) from c where pays is not null),
    'pays_detail', (select coalesce(jsonb_object_agg(pays, n), '{}'::jsonb)
                    from (select pays, count(*) as n from c where pays is not null group by pays) d),
    'pays_metiers', (select coalesce(jsonb_object_agg(pays, detail), '{}'::jsonb) from pm),
    'signes', (select count(*) from public.projects where bandeau in ('signe', 'tourne'))
  );
$$;
