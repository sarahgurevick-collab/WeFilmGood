-- La tagline remplace la logline dans la galaxie de l'accueil et la page du lien
-- de partage (05/10/2026). Les projets nés sur WFG 2 (sans legacy_id) avaient
-- rangé leur tagline dans « logline » et leur logline dans « synopsis » : on les
-- remet à leur place. « synopsis » n'est plus modifiable par les auteurs ; son
-- contenu reste en base.
update public.projects
   set tagline = logline, tagline_proposee = false, logline = synopsis, synopsis = null
 where legacy_id is null and logline is not null;

CREATE OR REPLACE FUNCTION public.projet_orbite()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with choix as (
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
     order by random()
     limit 1
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

drop function if exists public.get_shared_project(text);
create or replace function public.get_shared_project(p_code text)
 returns table(id uuid, title text, tagline text, format project_format, country text, genre_label text, labellise boolean, author_name text, vignette_path text)
 language sql
 stable security definer
 set search_path to ''
as $function$
  select
    p.id, p.title, p.tagline, p.format, p.country,
    g.label_fr,
    p.status = 'labellise',
    auteur.full_name,
    (
      select pf.storage_path from public.project_files pf
      where pf.project_id = p.id and pf.kind = 'vignette'
      order by pf.uploaded_at desc limit 1
    )
  from public.projects p
  left join public.genres g on g.slug = p.genre_slug
  join public.profiles auteur on auteur.id = p.owner_id
  where p.share_code = p_code;
$function$;
grant execute on function public.get_shared_project(text) to anon, authenticated, service_role;
