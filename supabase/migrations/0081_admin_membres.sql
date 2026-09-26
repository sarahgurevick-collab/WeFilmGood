-- L'écran d'administration des membres (reconstruit d'après celui de
-- WFG 1, 26/09/2026) : une fonction réservée à l'administration qui
-- renvoie, pour chaque profil, ce qu'il faut pour filtrer et trier —
-- métier (celui de WFG 2 s'il existe, sinon le rôle repris de WFG 1),
-- pays, adhésion, nombre de projets déposés, année et formats du dernier
-- projet, dernière activité (connexion sur WFG 2, journal de WFG 1, ou
-- dernière modification d'un projet).
create index if not exists user_log_user_id_date_idx on wfg1.user_log (user_id, date desc);

create or replace function public.admin_membres()
returns table (
  profile_id uuid,
  full_name text,
  email text,
  category public.profile_category,
  role_wfg1 text,
  country text,
  city text,
  website text,
  biofilmo text,
  validation_status public.profile_validation_status,
  inscrit_le timestamptz,
  adhesion text,
  nb_projets bigint,
  dernier_projet_annee integer,
  formats text[],
  derniere_activite timestamptz,
  est_lecteur boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with projets as (
    select owner_id,
           count(*) as nb,
           max(coalesce(pr.created_at, pr.updated_at)) as dernier,
           array_agg(distinct pr.format) filter (where pr.format is not null) as formats,
           max(pr.updated_at) as modifie
      from public.projects pr
     group by owner_id
  ),
  journal as (
    select user_id, max(date) as derniere
      from wfg1.user_log
     group by user_id
  )
  select
    p.id,
    p.full_name,
    au.email,
    p.category,
    a.role,
    p.country,
    p.city,
    p.website,
    p.biofilmo,
    p.validation_status,
    coalesce(a.registration_date::timestamptz, p.created_at),
    (select m.plan_slug from public.memberships m
      where m.profile_id = p.id and m.status = 'active'
        and (m.expires_at is null or m.expires_at > now())
      order by m.started_at desc limit 1),
    coalesce(pj.nb, 0),
    extract(year from pj.dernier)::integer,
    pj.formats,
    greatest(au.last_sign_in_at, j.derniere::timestamptz, pj.modifie),
    exists (select 1 from public.profile_roles r where r.profile_id = p.id and r.role_slug = 'lecteur')
  from public.profiles p
  join auth.users au on au.id = p.id
  left join wfg1.accounts a on a.user_id::text = p.legacy_id
  left join projets pj on pj.owner_id = p.id
  left join journal j on j.user_id = a.user_id
  where public.is_admin();
$$;

revoke all on function public.admin_membres() from public;
grant execute on function public.admin_membres() to authenticated;
