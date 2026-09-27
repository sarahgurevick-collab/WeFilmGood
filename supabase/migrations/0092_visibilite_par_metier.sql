-- Restreindre la visibilité d'un projet (27/09/2026, décision de Sarah).
-- Sur WFG 2, un projet est visible de tous les membres par défaut. Son
-- porteur peut décocher des métiers (monteur, comédien…) : les membres de
-- ces métiers ne le voient plus, ni dans la pitchothèque ni sur sa fiche.
-- C'est réservé aux adhérents : si l'adhésion du porteur n'est plus
-- active, la restriction ne s'applique plus. Les restrictions de WFG 1
-- (producer_only_contact) ne sont pas reprises.

alter table public.projects add column if not exists visible_pour text[];
comment on column public.projects.visible_pour is
  'Métiers (roles.slug) qui voient le projet. NULL = tout le monde. Ne s''applique que si le porteur a une adhésion active.';

-- Les métiers d'un membre : ceux choisis sur WFG 2, sinon son rôle de WFG 1.
create or replace function public.metiers_du_membre(uid uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(array(select r.role_slug from public.profile_roles r
                 where r.profile_id = uid and r.role_slug <> 'lecteur'), '{}'),
    (select array[case a.role
        when 'author' then 'scenariste' when 'producer' then 'producteur'
        when 'director' then 'realisateur' when 'actor' then 'comedien'
        when 'novelist' then 'romancier' when 'composer' then 'compositeur'
        when 'photodirector' then 'directeur_photo' when 'editor' then 'monteur'
        when 'theater' then 'auteur_theatre' when 'comicbook' then 'auteur_bd'
        when 'animator2d3d' then 'animateur_2d_3d' when 'soundengineer' then 'sound_designer'
        when 'hdecorator' then 'chef_decorateur' when 'sfxcreator' then 'sfx_digitaux'
      end]
     from public.profiles p join wfg1.accounts a on a.user_id::text = p.legacy_id
     where p.id = uid),
    '{}'
  );
$$;

-- Le membre connecté peut-il voir ce projet ? (appelée seulement quand le
-- projet porte une restriction)
create or replace function public.projet_visible_pour_moi(p_owner uuid, p_visible text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_visible is null
      or auth.uid() = p_owner
      or public.is_admin()
      or not exists (
           select 1 from public.memberships m
           where m.profile_id = p_owner and m.status = 'active'
             and (m.expires_at is null or m.expires_at > now()))
      or public.metiers_du_membre(auth.uid()) && p_visible;
$$;

grant execute on function public.metiers_du_membre(uuid) to authenticated;
grant execute on function public.projet_visible_pour_moi(uuid, text[]) to anon, authenticated;

CREATE OR REPLACE FUNCTION public.pitchotheque(p_limite integer DEFAULT 60, p_decalage integer DEFAULT 0, p_format text DEFAULT NULL::text, p_genre text DEFAULT NULL::text, p_audience text DEFAULT NULL::text, p_budget text DEFAULT NULL::text, p_bandeau text DEFAULT NULL::text, p_equipe text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, total bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with fichiers as (
    select
      f.project_id,
      bool_or(f.kind = 'vignette') as a_vignette,
      bool_or(f.kind = 'scenario') as a_scenario
    from public.project_files f
    group by f.project_id
  ),
  personnages as (
    select c.project_id, count(*) as nombre
    from public.characters c
    group by c.project_id
  ),
  notes as (
    select
      p.id,
      p.status = 'labellise' as labellise,
      p.bandeau is not null as a_bandeau,
      (coalesce(btrim(p.videopitch_fr), '') <> ''
       or coalesce(btrim(p.videopitch_en), '') <> ''
       or coalesce(btrim(p.trailer_url), '') <> '') as a_videopitch,
      round(
        (case when coalesce(btrim(p.logline), '') <> '' then 20 else 0 end
         + case when coalesce(btrim(p.synopsis), '') <> '' then 20 else 0 end
         + case when coalesce(f.a_vignette, false) then 20 else 0 end
         + case when coalesce(f.a_scenario, false) then 20 else 0 end
         + case when p.genre_slug is not null then 10 else 0 end
         + case when p.format is not null then 10 else 0 end
         + case when coalesce(pe.nombre, 0) > 0 then 10 else 0 end) * 100.0 / 110
      ) as remplissage
    from public.projects p
    left join fichiers f on f.project_id = p.id
    left join personnages pe on pe.project_id = p.id
    where p.is_public
    and (p.visible_pour is null or public.projet_visible_pour_moi(p.owner_id, p.visible_pour))
      and exists (select 1 from public.project_files fv where fv.project_id = p.id and fv.kind = 'vignette')
      and (p_format is null or p.format::text = p_format)
      and (p_genre is null or p.genre_slug = p_genre)
      and (p_audience is null or p.target_audience = p_audience)
      and (p_budget is null or p.budget_range = p_budget)
      and (p_bandeau is null or (p_bandeau = 'tous' and p.bandeau is not null) or p.bandeau = p_bandeau)
      and (p_equipe is null or (coalesce(p.bandeau, '') not in ('tourne', 'film_prime')
           and exists (select 1 from public.project_co_authors ca
                      where ca.project_id = p.id and ca.status = 'accepte'
                        and (ca.role_slug = p_equipe
                             or (p_equipe = 'tous' and ca.role_slug in ('producteur', 'realisateur'))))))
  )
  ,
  classes as (
    select
      n.id,
      n.a_bandeau,
      case
        when n.a_bandeau or n.labellise then 0
        when n.a_videopitch then 1
        else 2
      end as famille,
      case
        when n.a_bandeau or n.labellise then 0
        when n.remplissage >= 50 then 1
        when n.remplissage >= 30 then 2
        else 3
      end as tranche,
      md5(n.id::text || ((now() at time zone 'Europe/Paris')::date)::text) as tirage
    from notes n
  ),
  -- Chaque nuit, vingt projets à bandeau tirés au sort sont semés dans
  -- les dix premières pages, deux par page ; les autres sont mêlés aux
  -- labellisés des pages suivantes (27/09/2026). Tous ont été labellisés.
  bandeaux as (
    select c.id, row_number() over (order by c.tirage) - 1 as r
    from classes c
    where c.a_bandeau
  ),
  places as (
    select
      c.*,
      -- place visée (page r/2, un en haut, un au milieu), moins les projets
      -- déjà semés avant lui, puisqu'ils ne comptent pas dans « rang ».
      case when b.r < 20 then (b.r / 2) * 50 + (b.r % 2) * 25 + 12 - b.r + 0.5 end as place_semee,
      row_number() over (
        partition by c.famille, c.tranche, c.a_bandeau, coalesce(b.r < 20, false)
        order by c.tirage
      ) as rang,
      count(*) over (
        partition by c.famille, c.tranche, c.a_bandeau, coalesce(b.r < 20, false)
      ) as effectif,
      count(*) filter (where not c.a_bandeau) over (partition by c.famille, c.tranche) as labellises
    from classes c
    left join bandeaux b on b.id = c.id
  )
  select
    p.id,
    count(*) over () as total
  from places p
  order by p.famille, p.tranche,
    -- les projets à bandeau non tirés ce jour-là passent après les
    -- labellisés : les dix premières pages en gardent deux, pas plus.
    -- les projets à bandeau non tirés ce jour-là sont mêlés aux autres
    -- labellisés, mais au-delà de la dixième page, qui garde ses deux.
    case
      when p.place_semee is not null then p.place_semee
      when p.a_bandeau then 480 + (p.rang::numeric / (p.effectif + 1)) * greatest(p.labellises - 480, 1)
      else p.rang
    end,
    p.tirage
  limit greatest(p_limite, 0)
  offset greatest(p_decalage, 0);
$function$;

CREATE OR REPLACE FUNCTION public.rechercher_projets(q text, p_limite integer DEFAULT 60, p_format text DEFAULT NULL::text, p_genre text DEFAULT NULL::text, p_audience text DEFAULT NULL::text, p_budget text DEFAULT NULL::text, p_bandeau text DEFAULT NULL::text, p_equipe text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, score real, total bigint)
 LANGUAGE sql
 STABLE
AS $function$
  with terme as (
    -- Le texte tapé sert de motif ilike : on neutralise %, _ et \, sinon
    -- un visiteur qui tape "100 %" ferait un joker qui remonte tout.
    -- Sans accents (27/09) : « algerie » trouve « Algérie ».
    select nullif(btrim(public.sans_accent(q)), '') as mot,
           '%' || replace(replace(replace(btrim(public.sans_accent(q)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as motif
  ),
  -- Les mots-clés d'abord : ce sont eux qui décrivent le mieux un projet,
  -- ils dominent donc le classement.
  mots as (
    select k.id,
      case
        when lower(public.sans_accent(k.label_fr)) = lower(t.mot) then 1.00  -- le mot-clé exact
        when public.sans_accent(k.label_fr) ilike t.motif then 0.90          -- "road" dans "road trip"
        else 0.60                                        -- rattrapé par similarité (faute de frappe)
      end as score
    from public.keywords k, terme t
    where t.mot is not null
      and (public.sans_accent(k.label_fr) ilike t.motif or similarity(public.sans_accent(k.label_fr), t.mot) >= 0.45)
  ),
  par_mot as (
    select pk.project_id, max(m.score) as score
    from public.project_keywords pk
    join mots m on m.id = pk.keyword_id
    group by pk.project_id
  ),
  par_texte as (
    select p.id as project_id,
      greatest(
        case when lower(public.sans_accent(p.title)) = lower(t.mot) then 0.95
             when public.sans_accent(p.title) ilike t.motif then 0.75 else 0 end,
        case when public.sans_accent(p.logline) ilike t.motif then 0.50 else 0 end,
        -- Le pays où se déroule l'action (27/09) : « Algérie » remonte
        -- tous les projets qui s'y passent, même s'ils ne le disent pas
        -- dans leur texte. Il remplace le filtre par pays de WFG 1.
        case when public.sans_accent(p.country) ilike t.motif then 0.45 else 0 end,
        case when public.sans_accent(p.synopsis) ilike t.motif then 0.40 else 0 end
      ) as score
    from public.projects p, terme t
    where t.mot is not null
      and (public.sans_accent(p.title) ilike t.motif or public.sans_accent(p.logline) ilike t.motif
           or public.sans_accent(p.synopsis) ilike t.motif or public.sans_accent(p.country) ilike t.motif)
  ),
  tous as (
    select project_id, max(score) as score
    from (select * from par_mot union all select * from par_texte) u
    group by project_id
  )
  select t.project_id, t.score::real, count(*) over () as total
  from tous t
  join public.projects p on p.id = t.project_id
  where p.is_public
    and (p.visible_pour is null or public.projet_visible_pour_moi(p.owner_id, p.visible_pour))
    and exists (select 1 from public.project_files fv where fv.project_id = p.id and fv.kind = 'vignette')
    and (p_format is null or p.format::text = p_format)
    and (p_genre is null or p.genre_slug = p_genre)
    and (p_audience is null or p.target_audience = p_audience)
    and (p_budget is null or p.budget_range = p_budget)
    and (p_bandeau is null or (p_bandeau = 'tous' and p.bandeau is not null) or p.bandeau = p_bandeau)
      and (p_equipe is null or (coalesce(p.bandeau, '') not in ('tourne', 'film_prime')
           and exists (select 1 from public.project_co_authors ca
                      where ca.project_id = p.id and ca.status = 'accepte'
                        and (ca.role_slug = p_equipe
                             or (p_equipe = 'tous' and ca.role_slug in ('producteur', 'realisateur'))))))
  order by t.score desc, p.created_at desc
  limit p_limite;
$function$;
