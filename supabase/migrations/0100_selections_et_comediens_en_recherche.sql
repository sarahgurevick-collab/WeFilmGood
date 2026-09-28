-- Précision de Sarah (28/09/2026) : les sélections de la Maison des
-- Scénaristes et les comédiens envisagés sont bien des moyens de
-- recherche — mais « ailleurs » que dans les mots-clés. Un producteur
-- rencontré à Cannes retrouve le projet qui lui avait plu ; un directeur
-- de casting cherche ce qu'un auteur a écrit pour « Sophie Marceau ».
-- Deux menus de la recherche avancée, lisibles des membres.

-- 1. Les sélections : lisibles des membres (l'administration seule les modifie).
create policy "lisibles des membres" on public.project_selections
  for select using (auth.uid() is not null);

-- 2. Les comédiens envisagés (famille 8 de WFG 1), à part des mots-clés.
create table if not exists public.project_actors (
  project_id uuid not null references public.projects(id) on delete cascade,
  libelle text not null,
  primary key (project_id, libelle)
);
alter table public.project_actors enable row level security;
create policy "lisibles des membres" on public.project_actors
  for select using (auth.uid() is not null);
create policy "administration" on public.project_actors
  for all using (public.is_admin()) with check (public.is_admin());

with famille8 as (
  select distinct btrim(regexp_replace(lower(public.sans_accent(btrim(fr))), '[^a-z0-9]+', '_', 'g'), '_') as slug, btrim(fr) as libelle
  from wfg1.keywords where category = 8 and coalesce(btrim(fr), '') <> ''
),
liens as (
  select pk.project_id, k.id as keyword_id, f.libelle
  from public.project_keywords pk
  join public.keywords k on k.id = pk.keyword_id
  join famille8 f on f.slug = k.slug
  where pk.source = 'wfg1'
),
ins as (
  insert into public.project_actors (project_id, libelle)
  select distinct project_id, libelle from liens
  on conflict do nothing
)
delete from public.project_keywords pk
using liens l
where pk.project_id = l.project_id and pk.keyword_id = l.keyword_id;

delete from public.keywords k
where k.slug in (select btrim(regexp_replace(lower(public.sans_accent(btrim(fr))), '[^a-z0-9]+', '_', 'g'), '_') from wfg1.keywords where category = 8)
  and not exists (select 1 from public.project_keywords pk where pk.keyword_id = k.id);

-- 3. Les listes pour les menus de la recherche avancée.
create or replace function public.selections_disponibles()
returns table (libelle text, effectif bigint)
language sql stable security definer set search_path = ''
as $$
  select s.libelle, count(*) from public.project_selections s
  join public.projects p on p.id = s.project_id where p.is_public
  group by s.libelle order by s.libelle desc;
$$;
create or replace function public.comediens_disponibles()
returns table (libelle text, effectif bigint)
language sql stable security definer set search_path = ''
as $$
  select a.libelle, count(*) from public.project_actors a
  join public.projects p on p.id = a.project_id where p.is_public
  group by a.libelle order by a.libelle;
$$;
grant execute on function public.selections_disponibles() to authenticated;
grant execute on function public.comediens_disponibles() to authenticated;
