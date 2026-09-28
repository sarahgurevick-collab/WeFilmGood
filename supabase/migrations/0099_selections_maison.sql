-- Les « appels à projets » de WFG 1 (famille 7 des mots-clés : Cannes
-- 2019, PCDV 2022, Clermont 2019…) sont les sélections faites par la
-- Maison des Scénaristes. Elles n'ont de sens que pour l'administration
-- (Sarah, 28/09/2026) : un membre qui cherche « Cannes » ne doit pas les
-- voir remonter. Elles quittent les mots-clés pour une table à part,
-- lisible de l'administration seule.
create table if not exists public.project_selections (
  project_id uuid not null references public.projects(id) on delete cascade,
  libelle text not null,
  primary key (project_id, libelle)
);
alter table public.project_selections enable row level security;
create policy "administration seule" on public.project_selections
  for all using (public.is_admin()) with check (public.is_admin());

with famille7 as (
  select distinct btrim(regexp_replace(lower(public.sans_accent(btrim(fr))), '[^a-z0-9]+', '_', 'g'), '_') as slug, btrim(fr) as libelle
  from wfg1.keywords where category = 7 and coalesce(btrim(fr), '') <> ''
),
liens as (
  select pk.project_id, k.id as keyword_id, f.libelle
  from public.project_keywords pk
  join public.keywords k on k.id = pk.keyword_id
  join famille7 f on f.slug = k.slug
  where pk.source = 'wfg1'
),
ins as (
  insert into public.project_selections (project_id, libelle)
  select distinct project_id, libelle from liens
  on conflict do nothing
)
delete from public.project_keywords pk
using liens l
where pk.project_id = l.project_id and pk.keyword_id = l.keyword_id;

-- Les mots-clés de cette famille que plus aucun projet ne porte.
delete from public.keywords k
where k.slug in (select btrim(regexp_replace(lower(public.sans_accent(btrim(fr))), '[^a-z0-9]+', '_', 'g'), '_') from wfg1.keywords where category = 7)
  and not exists (select 1 from public.project_keywords pk where pk.keyword_id = k.id);
