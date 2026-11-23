-- Films ou séries proches du projet, cités par l'auteur (Sarah, 23/11/2026) :
-- sous le Moodboard, l'auteur cite au moins trois films ou séries qui se
-- rapprochent de son projet. Le site cherche le titre dans sa base de films ;
-- s'il ne le trouve pas, le titre est gardé tel que l'auteur l'a écrit
-- (film_id vide). Pas de maximum.
create table if not exists public.projet_films_proches (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  film_id bigint references public.films_cnc(id) on delete set null,
  titre text not null check (length(btrim(titre)) between 1 and 200),
  created_at timestamptz not null default now()
);
create unique index if not exists projet_films_proches_film on public.projet_films_proches (project_id, film_id) where film_id is not null;
create unique index if not exists projet_films_proches_titre on public.projet_films_proches (project_id, lower(titre)) where film_id is null;
alter table public.projet_films_proches enable row level security;
drop policy if exists "films proches : porteur et administration" on public.projet_films_proches;
create policy "films proches : porteur et administration" on public.projet_films_proches to authenticated
  using (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));
grant select, insert, delete on public.projet_films_proches to authenticated;

-- Recherche d'un film par son titre, pour un membre connecté, sans ouvrir la
-- base des films : seuls le titre, l'année et le réalisateur sortent.
create or replace function public.chercher_film_par_titre(p_titre text)
returns table (film_id bigint, titre text, annee int, realisateur text)
language sql stable security definer set search_path = public, extensions
as $$
  with q as (
    select btrim(regexp_replace(lower(unaccent(coalesce(p_titre, ''))), '[^a-z0-9]+', ' ', 'g')) as t
  ),
  f as (
    select c.id, coalesce(c.titre_affiche, c.titre) as titre,
           coalesce(c.annee_sortie, c.annee_agrement)::int as annee, c.realisateur, c.entrees_france,
           c.titre_normalise as t1,
           btrim(regexp_replace(lower(unaccent(coalesce(c.titre_affiche, ''))), '[^a-z0-9]+', ' ', 'g')) as t2
      from films_cnc c
  )
  select f.id, f.titre, f.annee, f.realisateur
    from f, q
   where auth.uid() is not null
     and length(q.t) >= 2
     and (f.t1 like '%' || q.t || '%' or f.t2 like '%' || q.t || '%')
   order by (f.t1 = q.t or f.t2 = q.t) desc,
            (f.t1 like q.t || '%' or f.t2 like q.t || '%') desc,
            (' ' || f.t1 like '% ' || q.t || '%' or ' ' || f.t2 like '% ' || q.t || '%') desc,
            f.entrees_france desc nulls last, f.annee desc nulls last
   limit 8;
$$;
revoke all on function public.chercher_film_par_titre(text) from public, anon;
grant execute on function public.chercher_film_par_titre(text) to authenticated;

-- Année et réalisateur des films cités qui ont été trouvés dans la base, pour
-- le porteur du projet ou l'administration.
create or replace function public.films_proches_cites(p_project uuid)
returns table (film_id bigint, annee int, realisateur text)
language sql stable security definer set search_path = public
as $$
  select f.id, coalesce(f.annee_sortie, f.annee_agrement)::int, f.realisateur
    from projet_films_proches c
    join films_cnc f on f.id = c.film_id
    join projects p on p.id = c.project_id
   where c.project_id = p_project
     and (p.owner_id = auth.uid() or public.is_admin());
$$;
revoke all on function public.films_proches_cites(uuid) from public, anon;
grant execute on function public.films_proches_cites(uuid) to authenticated;
