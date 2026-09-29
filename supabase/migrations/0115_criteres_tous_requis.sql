-- Plusieurs mots = plusieurs critères à remplir TOUS (29/09/2026, retour
-- de Sarah) : « espagnol » donnait 163 talents et « espagnol musique »
-- 499, parce qu'un talent qui ne cochait qu'un des deux restait dans la
-- liste. Ajouter un mot resserre désormais la recherche.

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
  -- Avec plusieurs critères, pas de passage par les projets : la recherche
  -- de projets retient encore les projets qui n'en cochent qu'un.
  projets as (
    select r.id, r.score from public.rechercher_projets(q, 1000) r
    where (select count(*) from public.mots_de_recherche(q)) < 2
  ),
  par_projet as (
    select p.owner_id as id, pj.score * 0.5 as score
    from projets pj join public.projects p on p.id = pj.id
    union all
    select ca.profile_id, pj.score * 0.5
    from projets pj join public.project_co_authors ca on ca.project_id = pj.id
    where ca.status = 'accepte' and ca.profile_id is not null
  ),
  -- Les mots-clés tirés de la biographie (29/09) : chaque mot de la
  -- recherche est un critère, coché par un mot-clé ou par un métier
  -- (« compositeur qui connaît la recherche scientifique » : le métier
  -- compositeur + le mot-clé recherche scientifique). Plus le talent coche
  -- de critères, plus il monte ; tous cochés, il passe devant le reste.
  crit_mots as (select * from public.criteres_de_recherche(q)),
  crit_metiers as (
    select r.slug, m.w as critere
    from public.roles r, public.mots_de_recherche(q) as m(w)
    where r.slug <> 'lecteur'
      and (lower(public.sans_accent(r.label_fr)) = m.w
           or exists (select 1 from unnest(r.synonymes) syn where lower(public.sans_accent(syn)) = m.w))
  ),
  nb_criteres as (
    select count(distinct critere)::real as n
    from (select critere from crit_mots union select critere from crit_metiers) c
  ),
  coches as (
    select pk.profile_id as id, c.critere
    from crit_mots c join public.profile_keywords pk on pk.keyword_id = c.keyword_id
    union
    select pr.profile_id, c.critere
    from crit_metiers c join public.profile_roles pr on pr.role_slug = c.slug
    union
    select w.profile_id, c.critere
    from crit_metiers c join public.wfg1_metiers_membres w on w.slug = c.slug
    where not exists (select 1 from public.profile_roles pr
                      where pr.profile_id = w.profile_id and pr.role_slug <> 'lecteur')
  ),
  par_mot_cle as (
    select co.id, 0.45 + 0.45 * count(distinct co.critere)::real / max(nb.n) as score
    from coches co, nb_criteres nb
    where nb.n > 0
    group by co.id
    -- Plusieurs critères : il faut les cocher tous (« espagnol musique »
    -- = qui parle espagnol ET fait de la musique).
    having count(distinct co.critere) = max(nb.n)
  ),
  tous as (
    select u.id, max(u.score) as score
    from (select * from par_metier union all select * from par_texte union all select * from par_projet
          union all select * from par_mot_cle) u
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
    where (select count(*) from public.mots_de_recherche(q)) < 2
  ),
  crit_mots as (select * from public.criteres_de_recherche(q)),
  par_mot_cle as (
    select ck.character_id as id,
           0.45 + 0.45 * count(distinct c.critere)::real
                  / (select count(distinct critere) from crit_mots) as score
    from crit_mots c
    join public.character_keywords ck on ck.keyword_id = c.keyword_id
    group by ck.character_id
    having count(distinct c.critere) = (select count(distinct critere) from crit_mots)
  ),
  tous as (
    select u.id, max(u.score) as score
    from (select * from par_texte union all select * from par_projet union all select * from par_mot_cle) u
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
