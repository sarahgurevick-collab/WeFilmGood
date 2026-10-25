-- Les auteurs sélectionnés avant WFG 1 (2012-2015) qui n'ont aucun profil
-- (25/10/2026, Sarah : « Oui, c'est décidé, les libellés me vont »).
--
-- L'onglet admin « Auteurs sélectionnés sans profil » liste les noms des
-- sélections de « Notre histoire » qu'aucun profil ne porte, et crée le
-- profil d'un clic, avec son compte de connexion (aucun email envoyé : la
-- personne se connectera à l'ouverture de WFG 2 avec cette adresse). Sans
-- adresse, le compte porte une adresse fictive, remplacée plus tard depuis
-- l'écran des membres (« Modifier ») : c'est le même profil.

-- 1. Les noms (déjà découpés, un auteur par case) qu'aucun profil ne porte,
--    quel que soit son état. Comparaison large : mêmes mots dans n'importe
--    quel ordre (« Erde Tamara » = « Tamara Erde »), pour ne jamais proposer
--    de créer un doublon.
create or replace function public.noms_sans_profil(noms text[])
returns table (idx int)
language sql
stable
security definer
set search_path = public
as $$
  with cles as (
    select distinct array_to_string(array(
             select m from unnest(string_to_array(public.cle_rapprochement(t), ' ')) m
             where m <> '' order by m), ' ') as cle
    from public.profiles p,
         lateral (values (p.full_name),
                         (coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))) v(t)
  ),
  n as (
    select (e.ordinality - 1)::int as idx,
           array_to_string(array(
             select m from unnest(string_to_array(public.cle_rapprochement(e.nom), ' ')) m
             where m <> '' order by m), ' ') as cle
    from unnest(noms) with ordinality as e(nom, ordinality)
  )
  select n.idx from n
  where n.cle <> '' and not exists (select 1 from cles where cles.cle = n.cle)
    and public.is_admin();
$$;

comment on function public.noms_sans_profil(text[]) is
  'Parmi des noms, ceux qu''aucun profil ne porte (mêmes mots, tout ordre). Administration seulement.';

revoke all on function public.noms_sans_profil(text[]) from public, anon;
grant execute on function public.noms_sans_profil(text[]) to authenticated, service_role;

-- 2. L'écran des membres : un profil créé sans adresse a un compte à
--    l'adresse fictive <id>@sans-adresse.invalid (src/lib/sans-adresse.ts),
--    affichée vide (« Modifier » pour mettre la vraie). Les profils sans
--    compte du tout y figurent aussi ; le profil vide sans nom qui traîne
--    depuis le 28/09 reste caché.
create or replace function public.admin_membres()
 returns table(profile_id uuid, full_name text, email text, category profile_category, role_wfg1 text, country text, city text, postal_code text, avatar_url text, website text, biofilmo text, validation_status profile_validation_status, inscrit_le timestamp with time zone, adhesion text, nb_projets bigint, dernier_projet_annee integer, formats text[], derniere_activite timestamp with time zone, est_lecteur boolean)
 language sql
 stable security definer
 set search_path to ''
as $function$
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
    case when au.email like '%@sans-adresse.invalid' then null else au.email end,
    p.category,
    a.role,
    p.country,
    p.city,
    a.postal_code,
    p.avatar_url,
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
  left join auth.users au on au.id = p.id
  left join wfg1.accounts a on a.user_id::text = p.legacy_id
  left join projets pj on pj.owner_id = p.id
  left join journal j on j.user_id = a.user_id
  where public.is_admin()
    and (au.id is not null or nullif(trim(p.full_name), '') is not null);
$function$;
