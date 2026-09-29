-- La recherche de talents par métier ne connaissait que le nom exact du
-- métier (29/09/2026) : « ingénieur du son » ne trouvait pas les 19
-- membres de WFG 1 inscrits comme tels (rangés sous « Sound designer »),
-- seulement ceux qui en parlent dans leur biographie. Chaque métier reçoit
-- ses autres noms, masculins, féminins et courants.
alter table public.roles add column if not exists synonymes text[] not null default '{}';

update public.roles set synonymes = v.s from (values
  ('sound_designer', array['ingénieur du son', 'ingénieure du son', 'preneur de son', 'preneuse de son', 'mixeur', 'mixeuse', 'sound design']),
  ('compositeur', array['compositrice', 'musicien', 'musicienne', 'compositeur de musique de film']),
  ('comedien', array['comédienne', 'acteur', 'actrice']),
  ('realisateur', array['réalisatrice', 'metteur en scène', 'metteuse en scène']),
  ('producteur', array['productrice', 'production']),
  ('scenariste', array['auteur', 'autrice', 'scénario']),
  ('romancier', array['romancière', 'écrivain', 'écrivaine']),
  ('directeur_photo', array['directrice photo', 'directeur de la photographie', 'directrice de la photographie', 'chef opérateur', 'cheffe opératrice']),
  ('monteur', array['monteuse', 'montage']),
  ('chef_decorateur', array['cheffe décoratrice', 'décorateur', 'décoratrice']),
  ('auteur_theatre', array['autrice de théâtre', 'dramaturge']),
  ('auteur_bd', array['autrice de bd', 'dessinateur', 'dessinatrice', 'bande dessinée']),
  ('animateur_2d_3d', array['animatrice', 'animation']),
  ('sfx_digitaux', array['effets spéciaux', 'vfx'])
) as v(slug, s)
where roles.slug = v.slug;

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

