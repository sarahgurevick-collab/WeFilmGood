-- Mots-clés des films du CNC (21/11/2026, demande de Sarah), tirés du
-- résumé public du film (TMDB) avec les mêmes consignes que les projets :
-- servent à comparer, dans les statistiques, les thèmes des films sortis
-- à ceux des projets. Administration seulement, comme films_cnc.
alter table public.films_cnc add column if not exists resume text;
alter table public.films_cnc add column if not exists tmdb_id integer;

create table if not exists public.films_cnc_mots_cles (
  film_id bigint not null references public.films_cnc(id) on delete cascade,
  mot text not null,
  primary key (film_id, mot)
);
create index if not exists films_cnc_mots_cles_mot on public.films_cnc_mots_cles (mot);

alter table public.films_cnc_mots_cles enable row level security;
revoke all on public.films_cnc_mots_cles from anon, authenticated;
create policy "films_cnc_mots_cles : administration" on public.films_cnc_mots_cles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.films_cnc_mots_cles to authenticated;

-- Les thématiques des films par année. Année = sortie en salle quand on
-- la connaît, sinon année de l'agrément du CNC. Même forme de réponse
-- que statistiques_thematiques.
create or replace function public.statistiques_thematiques_films()
returns table (annee int, total int, mot text, nb int)
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'réservé à l''administration';
  end if;
  return query
  with retenus as (
    select f.id, coalesce(f.annee_sortie, f.annee_agrement)::int as an
      from films_cnc f
     where exists (select 1 from films_cnc_mots_cles m where m.film_id = f.id)
  ),
  totaux as (select r.an, count(*)::int as n from retenus r group by r.an)
  select r.an, t.n, lower(m.mot), count(*)::int
    from retenus r
    join films_cnc_mots_cles m on m.film_id = r.id
    join totaux t on t.an = r.an
   group by r.an, t.n, lower(m.mot)
  having count(*) >= 2
   order by r.an, count(*) desc;
end;
$$;

revoke all on function public.statistiques_thematiques_films() from public, anon;
grant execute on function public.statistiques_thematiques_films() to authenticated;
