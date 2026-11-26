-- Noms des sélections proches d'un profil (26/11/2026, Sarah).
--
-- L'onglet « Auteurs sélectionnés sans profil » compare les noms lettre à
-- lettre : « Show Shun Lee » dans la liste de Cannes et « Show Chun Lee » sur
-- le site passaient pour deux personnes, et la création du profil butait sur
-- « adresse déjà utilisée ». Sarah tranche désormais elle-même, depuis
-- l'onglet /admin/noms-proches : « même personne » ou non.
--
--   meme  : le nom de la liste désigne ce profil. Il sort de l'onglet des
--           auteurs sans profil, et son nom mène au profil dans « Notre
--           histoire ».
--   autre : ce n'est pas la même personne ; la paire n'est plus proposée.

create or replace function public.cle_triee(texte text)
returns text
language sql
immutable parallel safe
set search_path = public
as $$
  select array_to_string(array(
    select m from unnest(string_to_array(public.cle_rapprochement(texte), ' ')) m
    where m <> '' order by m), ' ');
$$;

create table if not exists public.selections_noms_rapproches (
  cle text not null,
  nom text not null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  decision text not null check (decision in ('meme', 'autre')),
  decide_le timestamptz not null default now(),
  primary key (cle, profile_id)
);
-- Un nom de liste ne désigne qu'un seul profil.
create unique index if not exists selections_noms_rapproches_un_meme
  on public.selections_noms_rapproches (cle) where decision = 'meme';

-- Aucune règle : la table n'est lue et écrite que par les fonctions
-- ci-dessous et par le serveur (clé de service), après contrôle admin.
alter table public.selections_noms_rapproches enable row level security;

-- Les auteurs sans profil : un nom rapproché d'un profil n'en fait plus partie.
create or replace function public.noms_sans_profil(noms text[])
returns table(idx integer)
language sql
stable security definer
set search_path = public
as $$
  with cles as (
    select distinct public.cle_triee(t) as cle
    from public.profiles p,
         lateral (values (p.full_name),
                         (coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))) v(t)
  ),
  n as (
    select (e.ordinality - 1)::int as idx, public.cle_triee(e.nom) as cle
    from unnest(noms) with ordinality as e(nom, ordinality)
  )
  select n.idx from n
  where n.cle <> '' and not exists (select 1 from cles where cles.cle = n.cle)
    and not exists (
      select 1 from public.selections_noms_rapproches r
      where r.cle = n.cle and r.decision = 'meme')
    and public.is_admin();
$$;

-- Les noms des listes qui n'ont aucun profil au même nom, mais un profil au
-- nom très proche (trigrammes, seuil 0,62 : une ou deux lettres d'écart, un
-- trait d'union, un second prénom). Une ligne par paire à trancher.
create or replace function public.noms_proches(noms text[])
returns table(idx integer, profile_id uuid, nom text, email text, projets text)
language sql
stable security definer
set search_path = public, auth, extensions
as $$
  with pc as materialized (
    select p.id,
           btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as nom,
           public.cle_triee(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) as cle,
           public.cle_triee(p.full_name) as cle_complet
    from public.profiles p
    where p.anonymized_at is null
  ),
  n as materialized (
    select (e.ordinality - 1)::int as idx, public.cle_triee(e.nom) as cle
    from unnest(noms) with ordinality as e(nom, ordinality)
  ),
  sans as materialized (
    select n.idx, n.cle from n
    where n.cle <> ''
      and not exists (select 1 from pc where pc.cle = n.cle or pc.cle_complet = n.cle)
      and not exists (
        select 1 from public.selections_noms_rapproches r
        where r.cle = n.cle and r.decision = 'meme')
  )
  select s.idx, pc.id, pc.nom,
         case when u.email like '%@sans-adresse.invalid' then null else u.email::text end,
         (select string_agg(x.title, ' ; ' order by x.created_at) from public.projects x where x.owner_id = pc.id)
  from sans s
  join pc on pc.cle <> '' and similarity(pc.cle, s.cle) >= 0.62
  join auth.users u on u.id = pc.id
  where public.is_admin()
    and not exists (
      select 1 from public.selections_noms_rapproches r
      where r.cle = s.cle and r.profile_id = pc.id);
$$;

revoke all on function public.noms_proches(text[]) from public, anon;
grant execute on function public.noms_proches(text[]) to authenticated, service_role;

-- « Notre histoire » : le nom rapproché mène au profil, comme un nom exact.
create or replace function public.rapprocher_selections(lignes jsonb)
returns table(idx integer, project_id uuid, profile_id uuid)
language sql
stable security definer
set search_path = public
as $$
  with l as (
    select (e.ordinality - 1)::int as idx,
           public.cle_rapprochement(e.value->>'titre') as ct,
           public.cle_rapprochement(e.value->>'auteur') as ca
    from jsonb_array_elements(lignes) with ordinality as e
  ),
  membres as (
    select p.id, public.cle_rapprochement(p.full_name) as cle
    from public.profiles p
    where p.validation_status in ('validee', 'non_requise')
      and p.departed_at is null and p.anonymized_at is null
    union
    select p.id, public.cle_rapprochement(coalesce(p.last_name, '') || ' ' || coalesce(p.first_name, ''))
    from public.profiles p
    where p.validation_status in ('validee', 'non_requise')
      and p.departed_at is null and p.anonymized_at is null
      and p.first_name is not null and p.last_name is not null
  ),
  m_exact as (
    select l.idx, (array_agg(distinct membres.id))[1] as profile_id
    from l join membres on membres.cle = l.ca
    where l.ca <> ''
    group by l.idx
    having count(distinct membres.id) = 1
  ),
  m_rapproche as (
    select l.idx, r.profile_id
    from l
    join public.selections_noms_rapproches r
      on r.decision = 'meme' and r.cle = public.cle_triee(l.ca)
    join public.profiles p on p.id = r.profile_id
    where l.ca <> ''
      and p.validation_status in ('validee', 'non_requise')
      and p.departed_at is null and p.anonymized_at is null
      and not exists (select 1 from m_exact where m_exact.idx = l.idx)
  ),
  m as (
    select idx, profile_id from m_exact
    union all
    select idx, profile_id from m_rapproche
  ),
  fiches as (
    select p.id, p.owner_id, public.cle_rapprochement(p.title) as cle
    from public.projects p
    where p.is_public and p.masque_par_admin_le is null
  ),
  f1 as (
    select l.idx, (array_agg(distinct fiches.id))[1] as project_id
    from l
    join m using (idx)
    join fiches on fiches.cle = l.ct and fiches.owner_id = m.profile_id
    where l.ct <> ''
    group by l.idx
    having count(distinct fiches.id) = 1
  ),
  f2 as (
    select l.idx, (array_agg(distinct fiches.id))[1] as project_id
    from l
    join fiches on fiches.cle = l.ct
    where l.ct <> '' and not exists (select 1 from f1 where f1.idx = l.idx)
    group by l.idx
    having count(distinct fiches.id) = 1
  )
  select l.idx, coalesce(f1.project_id, f2.project_id) as project_id, m.profile_id
  from l
  left join f1 using (idx)
  left join f2 using (idx)
  left join m using (idx)
  where f1.project_id is not null or f2.project_id is not null or m.profile_id is not null;
$$;

-- Le profil qui porte déjà une adresse (message « adresse déjà utilisée » de
-- l'onglet des auteurs sélectionnés). Réservé au serveur.
create or replace function public.profil_de_l_adresse(p_email text)
returns table(id uuid, nom text)
language sql
stable security definer
set search_path = public, auth
as $$
  select p.id, btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(btrim(p_email))
  limit 1;
$$;
revoke all on function public.profil_de_l_adresse(text) from public, anon, authenticated;
grant execute on function public.profil_de_l_adresse(text) to service_role;
