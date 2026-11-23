-- Le match entre projets (Sarah, 23/11/2026) : chaque projet reçoit UN
-- match, le projet de la plateforme le plus proche par ses mots-clés.
--  * non réciproque, comme le CinéMatch ;
--  * il se dévoile quand l'auteur a choisi au moins 3 mots dans chacun des
--    trois thèmes (styles, sujets, univers) ;
--  * projets proposables : ceux qui ont l'analyse automatique des mots-clés
--    (source « ia »), visibles des membres, non masqués, d'un autre auteur ;
--  * il change dès qu'un autre projet est plus proche (recalcul à chaque
--    enregistrement des mots-clés et chaque nuit) ; l'auteur en est prévenu
--    sur le site (vu_le vide = pas encore vu), pas par email ;
--  * sans adhésion, l'auteur ne sait pas quel est le projet : la base ne
--    donne que les mots en commun.
-- Le pourcentage reste en coulisse : il sert à choisir, il n'est pas affiché.

-- 1. Le calcul des projets proches (0307) sort de la fonction réservée à
--    l'administration, pour servir aussi au match. Même calcul, mot pour mot.
CREATE OR REPLACE FUNCTION public.projets_proches_calcul(p_project uuid DEFAULT NULL::uuid, p_mots text[] DEFAULT NULL::text[], p_limite integer DEFAULT 30)
 RETURNS TABLE(project_id uuid, titre text, format text, score real, mots_communs text[], pourcent integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  with demandes as (
    -- les mots cherchés : clé, mots de la clé, et s'ils ont été tapés à la main
    select d.cle, regexp_split_to_array(d.cle, '[^[:alnum:]]+') as mots, bool_or(d.tape) as tape
      from (
        select cle_singulier(k.label_fr) as cle, false as tape
          from project_keywords pk join keywords k on k.id = pk.keyword_id
         where pk.project_id = p_project
        union all
        select cle_singulier(btrim(m)), true
          from unnest(coalesce(p_mots, '{}')) m
         where length(btrim(m)) >= 2
      ) d
     group by d.cle
  ),
  mots_projets as materialized (
    select pk.project_id as film_id, k.label_fr as mot, k.cle_rapprochement as cle, k.cle_mots
      from project_keywords pk join keywords k on k.id = pk.keyword_id
     where pk.project_id is distinct from p_project
  ),
  frequences as (select m.cle, count(distinct m.film_id) as n from mots_projets m group by m.cle),
  nb as (select count(distinct m.film_id)::real as n from mots_projets m),
  rarete as (
    -- la rareté d'un mot cherché : celle de sa clé parmi les films
    select d.cle, d.mots, d.tape, power(ln(nb.n / (1 + coalesce(fq.n, 0))), 2)::real as poids
      from demandes d cross join nb left join frequences fq on fq.cle = d.cle
  ),
  touches as (
    -- le même mot
    select m.film_id, d.cle as demande, m.mot, d.poids
      from rarete d join mots_projets m on m.cle = d.cle
    union all
    -- le mot du film contient le mot cherché
    select m.film_id, d.cle, m.mot, 0.5 * d.poids
      from rarete d join mots_projets m on m.cle_mots @> d.mots and m.cle <> d.cle
    union all
    -- le mot cherché contient le mot du film : c'est la rareté du mot du film qui compte
    select m.film_id, d.cle, m.mot, 0.5 * power(ln(nb.n / (1 + fq.n)), 2)::real
      from rarete d cross join nb
      join mots_projets m on m.cle_mots <@ d.mots and m.cle <> d.cle and length(m.cle) >= 4
      join frequences fq on fq.cle = m.cle
  ),
  par_demande as (
    select distinct on (t.film_id, t.demande) t.film_id, t.demande, t.mot, t.poids
      from touches t
     order by t.film_id, t.demande, t.poids desc
  ),
  scores as (
    select p.film_id, sum(p.poids)::real as score,
           (array_agg(p.mot order by p.poids desc)) as communs
      from par_demande p
     group by p.film_id
  )
  select pr.id, pr.title, pr.format::text, s.score, s.communs,
         least(100, round(100 * s.score / nullif((select sum(d.poids) from rarete d), 0)))::int
    from scores s
    join projects pr on pr.id = s.film_id
   order by s.score desc, pr.title
   limit greatest(1, least(coalesce(p_limite, 30), 100));
end;
$function$;
revoke all on function public.projets_proches_calcul(uuid, text[], int) from public, anon, authenticated;
grant execute on function public.projets_proches_calcul(uuid, text[], int) to service_role;

create or replace function public.projets_proches(p_project uuid default null, p_mots text[] default null, p_limite int default 30)
returns table (project_id uuid, titre text, format text, score real, mots_communs text[], pourcent int)
language plpgsql stable security definer set search_path = public
as $fn$
begin
  if not public.is_admin() then
    raise exception 'réservé à l''administration';
  end if;
  return query select * from public.projets_proches_calcul(p_project, p_mots, p_limite);
end;
$fn$;

-- 2. Le match de chaque projet.
create table if not exists public.projets_matchs (
  project_id uuid primary key references public.projects(id) on delete cascade,
  match_id uuid not null references public.projects(id) on delete cascade,
  pourcent int,
  mots_communs text[] not null default '{}',
  calcule_le timestamptz not null default now(),
  change_le timestamptz not null default now(),
  vu_le timestamptz
);
comment on table public.projets_matchs is
  'Le match de chaque projet (23/11/2026) : le projet le plus proche par les mots-clés. Lu seulement par les fonctions mon_match et consorts.';
alter table public.projets_matchs enable row level security;

create or replace function public.match_seuil() returns int language sql immutable as $$ select 3 $$;

-- Combien de mots l'auteur a choisis dans chaque thème.
create or replace function public.match_themes(p_project uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'styles', count(*) filter (where theme_auteur = 'styles'),
    'sujets', count(*) filter (where theme_auteur = 'sujets'),
    'univers', count(*) filter (where theme_auteur = 'univers'))
  from public.project_keywords
  where project_id = p_project and source = 'demande_auteur';
$$;
revoke all on function public.match_themes(uuid) from public, anon, authenticated;

create or replace function public.match_pret(p_project uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select (t->>'styles')::int >= public.match_seuil()
     and (t->>'sujets')::int >= public.match_seuil()
     and (t->>'univers')::int >= public.match_seuil()
  from public.match_themes(p_project) t;
$$;
revoke all on function public.match_pret(uuid) from public, anon, authenticated;

-- Calcule (ou recalcule) le match d'un projet. Appelée par l'auteur après
-- l'enregistrement de ses mots-clés, et par le passage de nuit.
create or replace function public.calculer_match(p_project uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_owner uuid;
  v_match uuid;
  v_pourcent int;
  v_mots text[];
begin
  select owner_id into v_owner from public.projects where id = p_project;
  if not found then return; end if;
  if not (coalesce(auth.role(), '') = 'service_role' or public.is_admin() or v_owner = auth.uid()) then
    raise exception 'Réservé à l''auteur de la fiche';
  end if;

  if not public.match_pret(p_project) then
    delete from public.projets_matchs where project_id = p_project;
    return;
  end if;

  select x.project_id, x.pourcent,
         array(select m from unnest(x.mots_communs) with ordinality u(m, n) group by m order by min(n))
    into v_match, v_pourcent, v_mots
  from public.projets_proches_calcul(p_project, null, 100) x
  join public.projects pr on pr.id = x.project_id
  where pr.is_public
    and pr.masque_par_admin_le is null
    and pr.owner_id is distinct from v_owner
    and exists (select 1 from public.project_keywords pk where pk.project_id = pr.id and pk.source = 'ia')
  order by x.score desc, pr.title
  limit 1;

  if v_match is null then
    delete from public.projets_matchs where project_id = p_project;
    return;
  end if;

  insert into public.projets_matchs as pm (project_id, match_id, pourcent, mots_communs)
  values (p_project, v_match, v_pourcent, coalesce(v_mots, '{}'))
  on conflict (project_id) do update set
    pourcent = excluded.pourcent,
    mots_communs = excluded.mots_communs,
    calcule_le = now(),
    change_le = case when pm.match_id is distinct from excluded.match_id then now() else pm.change_le end,
    vu_le = case when pm.match_id is distinct from excluded.match_id then null else pm.vu_le end,
    match_id = excluded.match_id;
end;
$fn$;
revoke all on function public.calculer_match(uuid) from public, anon;
grant execute on function public.calculer_match(uuid) to authenticated, service_role;

-- Le passage de nuit : tous les projets dont l'auteur a rempli ses trois thèmes.
create or replace function public.calculer_tous_les_matchs()
returns int language plpgsql security definer set search_path = public as $fn$
declare
  v_id uuid;
  v_n int := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' and not public.is_admin() then
    raise exception 'réservé à l''administration';
  end if;
  for v_id in
    select project_id from public.project_keywords
     where source = 'demande_auteur' and theme_auteur is not null
     group by project_id
    having count(*) >= 3 * public.match_seuil()
  loop
    perform public.calculer_match(v_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$fn$;
revoke all on function public.calculer_tous_les_matchs() from public, anon, authenticated;
grant execute on function public.calculer_tous_les_matchs() to service_role;

-- Ce que l'auteur voit de son match. Sans adhésion : les mots en commun,
-- jamais le projet ni son auteur.
create or replace function public.mon_match(p_project uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $fn$
declare
  v_owner uuid;
  v_adherent boolean;
  v_pm public.projets_matchs;
  v_res jsonb;
begin
  select owner_id into v_owner from public.projects where id = p_project;
  if not found or not (public.is_admin() or v_owner = auth.uid()) then
    return null;
  end if;
  v_adherent := public.is_admin() or public.a_une_adhesion_active(auth.uid());
  v_res := jsonb_build_object(
    'themes', public.match_themes(p_project),
    'seuil', public.match_seuil(),
    'pret', public.match_pret(p_project),
    'adherent', v_adherent);

  select * into v_pm from public.projets_matchs where project_id = p_project;
  if not found then return v_res; end if;

  v_res := v_res || jsonb_build_object(
    'mots_communs', to_jsonb(v_pm.mots_communs),
    'nouveau', v_pm.vu_le is null,
    'change_le', v_pm.change_le);
  if v_adherent then
    v_res := v_res || jsonb_build_object('projet', (
      select jsonb_build_object('id', pr.id, 'titre', pr.title, 'tagline', pr.tagline, 'auteur_id', pr.owner_id)
      from public.projects pr where pr.id = v_pm.match_id));
  end if;
  return v_res;
end;
$fn$;
revoke all on function public.mon_match(uuid) from public, anon;
grant execute on function public.mon_match(uuid) to authenticated, service_role;

-- L'auteur a vu son match : la pastille s'éteint.
create or replace function public.match_vu(p_project uuid)
returns void language sql security definer set search_path = public as $$
  update public.projets_matchs pm set vu_le = now()
   where pm.project_id = p_project and pm.vu_le is null
     and exists (select 1 from public.projects p where p.id = pm.project_id and p.owner_id = auth.uid());
$$;
revoke all on function public.match_vu(uuid) from public, anon;
grant execute on function public.match_vu(uuid) to authenticated;

-- La pastille : combien de mes projets ont un match que je n'ai pas encore vu.
create or replace function public.mes_matchs_nouveaux()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.projets_matchs pm
  join public.projects p on p.id = pm.project_id
  where p.owner_id = auth.uid() and pm.vu_le is null;
$$;
revoke all on function public.mes_matchs_nouveaux() from public, anon;
grant execute on function public.mes_matchs_nouveaux() to authenticated;

notify pgrst, 'reload schema';
