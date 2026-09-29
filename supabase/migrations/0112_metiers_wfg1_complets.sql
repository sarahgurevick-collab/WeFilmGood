-- WFG 1 rangeait les métiers à deux endroits (29/09/2026) : le métier
-- principal (accounts.role) et la liste de tous les métiers du membre
-- (accounts.job, des codes séparés par « | »). WFG 2 ne lisait que le
-- principal : un compositeur qui était aussi ingénieur du son n'apparaissait
-- que comme compositeur. Les deux sont lus désormais, le principal en tête.
--
-- Rien n'est recopié dans profile_roles : dès qu'un membre choisit ses
-- métiers sur WFG 2, c'est son choix qui compte.
--
-- Codes de WFG 1 (retrouvés en croisant avec les biographies, 21/09) :
-- 4 directeur photo, 5 comédien, 6 compositeur, 7 sound designer,
-- 8 monteur, 9 producteur, 10 réalisateur, 12 scénariste, 16 auteur BD,
-- 17 romancier, 18 auteur théâtre, 19 chef décorateur, 20 SFX,
-- 21 animateur 2D/3D. Les codes 0, 1, 3, 11 et 13 restent inconnus.
create or replace view public.wfg1_metiers_membres as
  with codes as (
    select p.id as profile_id,
      case a.role
        when 'author' then 'scenariste' when 'producer' then 'producteur'
        when 'director' then 'realisateur' when 'actor' then 'comedien'
        when 'novelist' then 'romancier' when 'composer' then 'compositeur'
        when 'photodirector' then 'directeur_photo' when 'editor' then 'monteur'
        when 'theater' then 'auteur_theatre' when 'comicbook' then 'auteur_bd'
        when 'animator2d3d' then 'animateur_2d_3d' when 'soundengineer' then 'sound_designer'
        when 'hdecorator' then 'chef_decorateur' when 'sfxcreator' then 'sfx_digitaux'
      end as slug,
      0 as rang
    from public.profiles p join wfg1.accounts a on a.user_id::text = p.legacy_id
    union all
    select p.id,
      case j.code
        when '4' then 'directeur_photo' when '5' then 'comedien' when '6' then 'compositeur'
        when '7' then 'sound_designer' when '8' then 'monteur' when '9' then 'producteur'
        when '10' then 'realisateur' when '12' then 'scenariste' when '16' then 'auteur_bd'
        when '17' then 'romancier' when '18' then 'auteur_theatre' when '19' then 'chef_decorateur'
        when '20' then 'sfx_digitaux' when '21' then 'animateur_2d_3d'
      end,
      j.rang::int
    from public.profiles p
    join wfg1.accounts a on a.user_id::text = p.legacy_id
    cross join lateral unnest(string_to_array(a.job, '|')) with ordinality j(code, rang)
  )
  select profile_id, slug, min(rang) as rang
  from codes
  where slug is not null
  group by profile_id, slug;

revoke all on public.wfg1_metiers_membres from public, anon, authenticated;

create or replace function public.metiers_du_membre(uid uuid)
 returns text[]
 language sql
 stable security definer
 set search_path to ''
as $$
  select coalesce(
    nullif(array(select r.role_slug from public.profile_roles r
                 where r.profile_id = uid and r.role_slug <> 'lecteur'), '{}'),
    nullif(array(select w.slug from public.wfg1_metiers_membres w
                 where w.profile_id = uid order by w.rang), '{}'),
    '{}'
  );
$$;

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
      and (public.sans_accent(r.label_fr) ilike t.motif
           -- Les autres noms du métier (« ingénieur du son », « actrice »).
           or exists (select 1 from unnest(r.synonymes) syn
                      where public.sans_accent(syn) ilike t.motif
                         or t.mot ilike '%' || public.sans_accent(syn) || '%'))
  ),
  par_metier as (
    -- Le métier choisi sur WFG 2, ou le métier principal de WFG 1, passe
    -- devant les métiers secondaires.
    select pr.profile_id as id, 0.75 as score
    from public.profile_roles pr join metiers m on m.slug = pr.role_slug
    union all
    -- Les membres de WFG 1 qui n'ont pas encore repris leurs métiers :
    -- le principal et tous les autres.
    select w.profile_id, case when w.rang = 0 then 0.75 else 0.70 end
    from public.wfg1_metiers_membres w join metiers m on m.slug = w.slug
    where not exists (select 1 from public.profile_roles pr
                      where pr.profile_id = w.profile_id and pr.role_slug <> 'lecteur')
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
         array(select r.label_fr
               from unnest(public.metiers_du_membre(c.id)) with ordinality m(slug, rang)
               join public.roles r on r.slug = m.slug
               order by m.rang)
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

