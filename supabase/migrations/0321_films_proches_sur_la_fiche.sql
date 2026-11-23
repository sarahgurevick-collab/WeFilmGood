-- Les films ou séries proches cités par l'auteur s'affichent sur la fiche
-- projet (Sarah, 23/11/2026) : pour les membres adhérents, le porteur du
-- projet et l'administration. Lecture sans ouvrir la base des films.
create or replace function public.films_proches_de_la_fiche(p_project uuid)
returns table (titre text, annee int, realisateur text)
language sql stable security definer set search_path = public
as $$
  select c.titre, coalesce(f.annee_sortie, f.annee_agrement)::int, f.realisateur
    from projet_films_proches c
    join projects p on p.id = c.project_id
    left join films_cnc f on f.id = c.film_id
   where c.project_id = p_project
     and (
       p.owner_id = auth.uid()
       or public.is_admin()
       or (p.is_public and public.a_une_adhesion_active(auth.uid()))
     )
   order by c.created_at;
$$;
revoke all on function public.films_proches_de_la_fiche(uuid) from public, anon;
grant execute on function public.films_proches_de_la_fiche(uuid) to authenticated;
