-- =====================================================================
-- Le projet du haut de l'accueil = le CinéCrush de la semaine
-- (24/11/2026, Sarah : « la partie "hero" montrera le cinecrush de la
-- semaine. Actuellement cela change à chaque connexion. Cela ne sera plus
-- le cas »).
--
-- projet_orbite() ne tire plus un projet au hasard à chaque visite :
--   1. le CinéCrush de la semaine en cours ;
--   2. s'il n'y en a pas de programmé, le dernier CinéCrush en date
--      (l'accueil ne change donc pas d'une visite à l'autre) ;
--   3. si aucun CinéCrush n'a jamais existé, un projet au hasard, comme
--      avant (0107, 0132).
-- Le reste de la fonction (personnages, équipe) ne change pas.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.projet_orbite()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with crush as (
    -- Le CinéCrush de la semaine ; s'il n'y en a pas, le dernier en date.
    select k.project_id as id
      from public.cinecrush k
      join public.projects p on p.id = k.project_id
     where k.semaine <= public.dimanche_de_la_semaine()
       and p.is_public
     order by k.semaine desc
     limit 1
  ),
  hasard as (
    select p.id
      from public.projects p
     where p.is_public
       and p.status <> 'brouillon'
       and length(coalesce(p.tagline, '')) > 20
       and exists (select 1 from public.project_files f
                    where f.project_id = p.id and f.kind = 'vignette')
       and (select count(*) from public.characters c
             where c.project_id = p.id
               and c.photo_path is not null
               and length(coalesce(c.biography, '')) > 30) >= 4
       and not exists (select 1 from crush)
     order by random()
     limit 1
  ),
  choix as (
    select id from crush
    union all
    select id from hasard
  )
  select jsonb_build_object(
    'id', p.id,
    'titre', p.title,
    'genre', g.label_fr,
    'tagline', p.tagline,
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
$function$;
