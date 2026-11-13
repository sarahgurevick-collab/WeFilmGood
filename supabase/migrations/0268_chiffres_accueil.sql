-- 13/11/2026, Sarah : les chiffres de l'accueil de WFG 1 reviennent sur
-- l'accueil de WFG 2, en anneau animé (talents par métier) et en nombres.
-- Des nombres seulement, lisibles sans compte.
--   talents      : les membres que la Galaxie des talents peut montrer
--                  (mêmes exclusions que rechercher_talents) ;
--   metiers      : ces membres par métier — un membre peut en avoir plusieurs ;
--   fiches       : fiches de lecture reprises de WFG 1 + archives + nouvelles ;
--   labellises   : projets ayant une fiche notée 151/200 ou plus ;
--   pays         : pays différents renseignés sur les profils ;
--   signes       : projets au bandeau « Signé » ou « Tourné ».
create or replace function public.chiffres_accueil()
returns jsonb
language sql stable security definer
set search_path to 'public'
as $$
  with c as materialized (
    select p.id
    from public.profiles p
    where p.anonymized_at is null
      and p.departed_at is null
      and coalesce(btrim(p.full_name), btrim(p.display_name), '') <> ''
      and not exists (select 1 from public.profile_roles l where l.profile_id = p.id and l.role_slug = 'lecteur')
      and not exists (select 1 from wfg1.accounts a where a.user_id::text = p.legacy_id and a.role = 'reader')
      and coalesce(p.category::text, '') <> 'cinephile'
  ),
  m as (
    select x.slug, count(*) as n
    from c cross join lateral unnest(public.metiers_du_membre(c.id)) x(slug)
    group by x.slug
  )
  select jsonb_build_object(
    'talents', (select count(*) from c),
    'metiers', (select coalesce(jsonb_object_agg(slug, n), '{}'::jsonb) from m),
    'fiches', (select count(*) from public.legacy_reading_reports)
              + (select count(*) from public.archives_fiches_lecture)
              + (select count(*) from public.reading_reports),
    'labellises', (select count(distinct project_id) from public.legacy_reading_reports where final_mark >= 151),
    'pays', (select count(distinct lower(btrim(country))) from public.profiles where coalesce(btrim(country), '') <> ''),
    'signes', (select count(*) from public.projects where bandeau in ('signe', 'tourne'))
  );
$$;
revoke all on function public.chiffres_accueil() from public;
grant execute on function public.chiffres_accueil() to anon, authenticated, service_role;
