-- Un seul champ de recherche pour trois catégories (29/09/2026) : projets,
-- talents, personnages. La recherche de projets existe déjà
-- (rechercher_projets) ; voici les deux autres.
--
-- Les talents et les personnages n'ont pas encore de mots-clés à eux. En
-- attendant, ils héritent de ceux de leurs projets : un talent remonte
-- pour « Bretagne » si l'un de ses projets en parle, un personnage si son
-- projet en parle. Ce qu'ils disent d'eux-mêmes (nom, métier, ville,
-- biographie) passe devant.
--
-- Les deux fonctions passent outre les règles d'accès ligne à ligne (trop
-- lentes sur des milliers de lignes) : elles refusent donc elles-mêmes les
-- visiteurs sans compte, et n'ouvrent que ce que les membres voient déjà.

-- Les talents. Jamais les lecteurs : leur profil n'est vu que d'eux-mêmes.
drop function if exists public.rechercher_talents(text, integer);
create or replace function public.rechercher_talents(q text, p_limite integer default 60)
returns table(id uuid, score real, total bigint, metiers text[])
language sql
stable
security definer
set search_path = public, extensions
as $$
  with terme as (
    select nullif(btrim(public.sans_accent(q)), '') as mot,
           '%' || replace(replace(replace(btrim(public.sans_accent(q)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif
  ),
  -- Les métiers dont le nom correspond (« producteur », « comédien »).
  metiers as (
    select r.slug from public.roles r, terme t
    where t.mot is not null and r.slug <> 'lecteur'
      and public.sans_accent(r.label_fr) ilike t.motif
  ),
  par_metier as (
    select pr.profile_id as id, 0.70 as score
    from public.profile_roles pr join metiers m on m.slug = pr.role_slug
    union all
    -- Les membres de WFG 1 qui n'ont pas encore repris leur métier.
    select p.id, 0.70
    from public.profiles p
    join wfg1.accounts a on a.user_id::text = p.legacy_id
    join metiers m on m.slug = case a.role
        when 'author' then 'scenariste' when 'producer' then 'producteur'
        when 'director' then 'realisateur' when 'actor' then 'comedien'
        when 'novelist' then 'romancier' when 'composer' then 'compositeur'
        when 'photodirector' then 'directeur_photo' when 'editor' then 'monteur'
        when 'theater' then 'auteur_theatre' when 'comicbook' then 'auteur_bd'
        when 'animator2d3d' then 'animateur_2d_3d' when 'soundengineer' then 'sound_designer'
        when 'hdecorator' then 'chef_decorateur' when 'sfxcreator' then 'sfx_digitaux'
      end
    where not exists (select 1 from public.profile_roles pr
                      where pr.profile_id = p.id and pr.role_slug <> 'lecteur')
  ),
  par_texte as (
    select p.id,
      greatest(
        case when lower(public.sans_accent(coalesce(p.full_name, ''))) = lower(t.mot) then 0.95
             when public.sans_accent(p.full_name) ilike t.motif
               or public.sans_accent(p.display_name) ilike t.motif then 0.85 else 0 end,
        case when public.sans_accent(p.city) ilike t.motif then 0.60 else 0 end,
        case when public.sans_accent(p.biofilmo) ilike t.motif
               or public.sans_accent(p.bio) ilike t.motif then 0.55 else 0 end
      ) as score
    from public.profiles p, terme t
    where t.mot is not null
      and (public.sans_accent(p.full_name) ilike t.motif or public.sans_accent(p.display_name) ilike t.motif
           or public.sans_accent(p.city) ilike t.motif or public.sans_accent(p.biofilmo) ilike t.motif
           or public.sans_accent(p.bio) ilike t.motif)
  ),
  -- Par leurs projets : l'auteur et l'équipe qui a accepté d'y figurer.
  projets as (
    select r.id, r.score from public.rechercher_projets(q, 1000) r
  ),
  par_projet as (
    select p.owner_id as id, pj.score * 0.5 as score
    from projets pj join public.projects p on p.id = pj.id
    union all
    select ca.profile_id, pj.score * 0.5
    from projets pj join public.project_co_authors ca on ca.project_id = pj.id
    where ca.status = 'accepte' and ca.profile_id is not null
  ),
  tous as (
    select u.id, max(u.score) as score
    from (select * from par_metier union all select * from par_texte union all select * from par_projet) u
    where u.id is not null
    group by u.id
  )
  -- Les métiers, en toutes lettres, pour les seuls talents affichés.
  select c.id, c.score, c.total,
         array(select r.label_fr from public.roles r
               where r.slug = any(public.metiers_du_membre(c.id)) order by r.label_fr)
  from (
  select t.id, t.score::real as score, count(*) over () as total,
         row_number() over (order by t.score desc, (p.avatar_url is not null) desc, p.full_name) as rang
  from tous t
  join public.profiles p on p.id = t.id
  where auth.uid() is not null
    and p.anonymized_at is null
    and p.departed_at is null
    and coalesce(btrim(p.full_name), btrim(p.display_name), '') <> ''
    and not exists (select 1 from public.profile_roles l where l.profile_id = p.id and l.role_slug = 'lecteur')
    and not exists (select 1 from wfg1.accounts a where a.user_id::text = p.legacy_id and a.role = 'reader')
  -- À score égal, ceux qui ont une photo d'abord.
  order by t.score desc, (p.avatar_url is not null) desc, p.full_name
  limit greatest(p_limite, 0)
  ) c
  order by c.rang;
$$;

-- Les personnages des projets visibles des membres (ceux de la Carte du
-- ciel : publics et avec une vignette).
create or replace function public.rechercher_personnages(q text, p_limite integer default 60)
returns table(id uuid, score real, total bigint)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with terme as (
    select nullif(btrim(public.sans_accent(q)), '') as mot,
           '%' || replace(replace(replace(btrim(public.sans_accent(q)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif
  ),
  par_texte as (
    select c.id,
      greatest(
        case when lower(public.sans_accent(c.name)) = lower(t.mot) then 0.95
             when public.sans_accent(c.name) ilike t.motif then 0.85 else 0 end,
        -- Le comédien imaginé par l'auteur (« Juliette Binoche »).
        case when public.sans_accent(c.actor_name) ilike t.motif then 0.80 else 0 end,
        case when public.sans_accent(c.biography) ilike t.motif then 0.60 else 0 end
      ) as score
    from public.characters c, terme t
    where t.mot is not null
      and (public.sans_accent(c.name) ilike t.motif or public.sans_accent(c.actor_name) ilike t.motif
           or public.sans_accent(c.biography) ilike t.motif)
  ),
  par_projet as (
    select c.id, r.score * 0.5 as score
    from public.rechercher_projets(q, 1000) r
    join public.characters c on c.project_id = r.id
  ),
  tous as (
    select u.id, max(u.score) as score
    from (select * from par_texte union all select * from par_projet) u
    group by u.id
  )
  select t.id, t.score::real, count(*) over () as total
  from tous t
  join public.characters c on c.id = t.id
  join public.projects p on p.id = c.project_id
  where auth.uid() is not null
    and p.is_public
    and exists (select 1 from public.project_files fv where fv.project_id = p.id and fv.kind = 'vignette')
  -- À score égal, ceux qui ont un portrait d'abord.
  order by t.score desc, (c.photo_path is not null) desc, c.name
  limit greatest(p_limite, 0);
$$;

revoke all on function public.rechercher_talents(text, integer) from public, anon;
revoke all on function public.rechercher_personnages(text, integer) from public, anon;
grant execute on function public.rechercher_talents(text, integer) to authenticated, service_role;
grant execute on function public.rechercher_personnages(text, integer) to authenticated, service_role;
