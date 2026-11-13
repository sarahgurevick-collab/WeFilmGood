-- 13/11/2026, Sarah : un clic sur « Pays connectés » ouvre un globe de
-- drapeaux avec le nombre de talents de chaque pays. Le décompte par pays
-- (pays_detail : code à deux lettres → nombre) porte sur les mêmes talents
-- que l'anneau ; « pays » devient le nombre de pays de ce décompte, pour
-- que le chiffre affiché et le globe disent la même chose.
create or replace function public.chiffres_accueil()
returns jsonb
language sql stable security definer
set search_path to 'public'
as $$
  with c as materialized (
    select p.id, nullif(upper(btrim(p.country)), '') as pays
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
    'pays', (select count(distinct pays) from c where pays is not null),
    'pays_detail', (select coalesce(jsonb_object_agg(pays, n), '{}'::jsonb)
                    from (select pays, count(*) as n from c where pays is not null group by pays) d),
    'signes', (select count(*) from public.projects where bandeau in ('signe', 'tourne'))
  );
$$;
