-- Les comptes lecteur hors des noms des sélections (27/11/2026). Un lecteur
-- a un compte à part, anonyme, même quand il est aussi auteur (deux comptes,
-- c'est normal). La page « Noms proches » proposait ces comptes lecteur à
-- côté des profils d'auteur (Cécile Rittweger, Srinath Samarasinghe, Julia
-- Echevarria y Figueroa), et « Notre histoire » trouvait deux profils au même
-- nom, donc aucun lien vers l'auteur. Les comptes lecteur (reader_profiles)
-- ne sont plus jamais rapprochés d'un nom des sélections.

create or replace function public.noms_proches(noms text[])
returns table(idx integer, profile_id uuid, nom text, email text, projets text)
language sql
stable security definer
set search_path = public, auth
set pg_trgm.similarity_threshold = 0.62
as $$
  with n as materialized (
    select (e.ordinality - 1)::int as idx, public.cle_triee(e.nom) as cle
    from unnest(noms) with ordinality as e(nom, ordinality)
  ),
  sans as materialized (
    select n.idx, n.cle from n
    where n.cle <> ''
      and not exists (
        select 1 from public.profiles p
        where public.cle_triee(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) = n.cle)
      and not exists (
        select 1 from public.profiles p where public.cle_triee(p.full_name) = n.cle)
      and not exists (
        select 1 from public.selections_noms_rapproches r
        where r.cle = n.cle and r.decision = 'meme')
  )
  select s.idx, p.id,
         btrim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')),
         case when u.email like '%@sans-adresse.invalid' then null else u.email::text end,
         (select string_agg(x.title, ' ; ' order by x.created_at) from public.projects x where x.owner_id = p.id)
  from sans s
  join public.profiles p
    on public.cle_triee(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')) % s.cle
  join auth.users u on u.id = p.id
  where public.is_admin()
    and p.anonymized_at is null
    and not exists (select 1 from public.reader_profiles l where l.profile_id = p.id)
    and not exists (
      select 1 from public.selections_noms_rapproches r
      where r.cle = s.cle and r.profile_id = p.id);
$$;

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
      and not exists (select 1 from public.reader_profiles lp where lp.profile_id = p.id)
    union
    select p.id, public.cle_rapprochement(coalesce(p.last_name, '') || ' ' || coalesce(p.first_name, ''))
    from public.profiles p
    where p.validation_status in ('validee', 'non_requise')
      and p.departed_at is null and p.anonymized_at is null
      and not exists (select 1 from public.reader_profiles lp where lp.profile_id = p.id)
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
      and not exists (select 1 from public.reader_profiles lp where lp.profile_id = p.id)
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
