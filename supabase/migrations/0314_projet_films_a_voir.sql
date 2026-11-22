-- « Films à voir » (Sarah, 22/11/2026) : sous les fiches de lecture d'un projet,
-- les films qu'elle conseille à l'auteur. Choisis et commentés à la main par
-- l'administration ; l'auteur ne voit le bloc que s'il y a au moins un film.
create table if not exists public.projet_films_a_voir (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  film_id bigint not null references public.films_cnc(id) on delete cascade,
  commentaire text,
  created_at timestamptz not null default now(),
  unique (project_id, film_id)
);
alter table public.projet_films_a_voir enable row level security;
drop policy if exists "films à voir : administration" on public.projet_films_a_voir;
create policy "films à voir : administration" on public.projet_films_a_voir to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Lecture pour l'auteur du projet (ou l'administration), sans ouvrir la base des films.
create or replace function public.films_a_voir_du_projet(p_project uuid)
returns table (id uuid, film_id bigint, titre text, annee int, realisateur text, pays text, tmdb_id int, commentaire text)
language sql stable security definer set search_path = public
as $$
  select v.id, f.id, coalesce(f.titre_affiche, f.titre), coalesce(f.annee_sortie, f.annee_agrement)::int,
         f.realisateur, f.pays, f.tmdb_id, v.commentaire
    from projet_films_a_voir v
    join films_cnc f on f.id = v.film_id
    join projects p on p.id = v.project_id
   where v.project_id = p_project
     and (p.owner_id = auth.uid() or public.is_admin())
   order by v.created_at;
$$;
