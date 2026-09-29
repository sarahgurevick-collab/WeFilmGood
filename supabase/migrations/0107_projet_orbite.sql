-- L'orbite de l'accueil : un projet tiré au hasard, avec ses personnages
-- et son équipe.
--
-- Les projets ne sont pas lisibles sans compte ; cette fonction passe
-- outre. Elle n'est donc ouverte qu'au serveur (service_role), jamais aux
-- visiteurs ni aux membres par l'API.
--
-- AVANT LA BASCULE sur wefilmgood.com : ne garder que les projets dont
-- l'auteur, l'équipe et les personnes en photo ont donné leur accord
-- (décision de Sarah du 29/09/2026). Tant que app.wefilmgood.com reste une
-- maquette que personne n'utilise, le tirage se fait sur tout le fonds.
create or replace function public.projet_orbite()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with choix as (
    select p.id
      from public.projects p
     where p.is_public
       and p.status <> 'brouillon'
       and length(coalesce(p.logline, '')) > 40
       and exists (select 1 from public.project_files f
                    where f.project_id = p.id and f.kind = 'vignette')
       and (select count(*) from public.characters c
             where c.project_id = p.id
               and c.photo_path is not null
               and length(coalesce(c.biography, '')) > 30) >= 4
     order by random()
     limit 1
  )
  select jsonb_build_object(
    'id', p.id,
    'titre', p.title,
    'genre', g.label_fr,
    'logline', p.logline,
    'personnages', coalesce((
      select jsonb_agg(jsonb_build_object(
               'nom', c.name,
               'age', c.age_range,
               'photo', c.photo_path,
               'bio', left(regexp_replace(c.biography, '\s+', ' ', 'g'), 220)
             ) order by c.position)
        from (select * from public.characters c
               where c.project_id = p.id
                 and c.photo_path is not null
                 and length(coalesce(c.biography, '')) > 30
               order by c.position
               limit 6) c
    ), '[]'::jsonb),
    'equipe', coalesce((
      select jsonb_agg(m order by m->>'ordre')
        from (
          select jsonb_build_object(
                   'ordre', '0',
                   'id', pr.id,
                   'nom', coalesce(nullif(trim(concat_ws(' ', pr.first_name, pr.last_name)), ''), pr.full_name),
                   'role', coalesce((select r.label_fr from public.profile_roles pro
                                       join public.roles r on r.slug = pro.role_slug
                                      where pro.profile_id = pr.id
                                      order by r.position limit 1), 'Auteur'),
                   'avatar', pr.avatar_url,
                   'bio', left(regexp_replace(coalesce(nullif(pr.bio, ''), pr.biofilmo, ''), '\s+', ' ', 'g'), 220)
                 ) m
            from public.profiles pr
           where pr.id = p.owner_id and pr.avatar_url is not null
          union all
          select jsonb_build_object(
                   'ordre', '1' || coalesce(pr.last_name, ''),
                   'id', pr.id,
                   'nom', coalesce(nullif(trim(concat_ws(' ', pr.first_name, pr.last_name)), ''), pr.full_name),
                   'role', coalesce(r.label_fr, 'Équipe'),
                   'avatar', pr.avatar_url,
                   'bio', left(regexp_replace(coalesce(nullif(pr.bio, ''), pr.biofilmo, ''), '\s+', ' ', 'g'), 220)
                 )
            from public.project_co_authors a
            join public.profiles pr on pr.id = a.profile_id
            left join public.roles r on r.slug = a.role_slug
           where a.project_id = p.id
             and a.status = 'accepte'
             and pr.avatar_url is not null
             and pr.id <> p.owner_id
        ) equipe
    ), '[]'::jsonb)
  )
  from choix
  join public.projects p on p.id = choix.id
  left join public.genres g on g.slug = p.genre_slug;
$$;

revoke all on function public.projet_orbite() from public, anon, authenticated;
grant execute on function public.projet_orbite() to service_role;

notify pgrst, 'reload schema';
