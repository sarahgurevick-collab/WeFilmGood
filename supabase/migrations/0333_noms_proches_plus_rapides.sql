-- Noms proches, plus rapides (26/11/2026). L'onglet « Auteurs sélectionnés
-- sans profil » interroge désormais lui aussi noms_proches, pour ne plus
-- proposer de créer un profil à quelqu'un qui en a probablement déjà un
-- (Sarah : « ton document n'est pas à jour »). Quatre secondes par
-- affichage, c'était trop : un index de trigrammes sur le nom trié.

create index if not exists profiles_cle_triee_trgm
  on public.profiles using gin (
    (public.cle_triee(coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) gin_trgm_ops);

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
    and not exists (
      select 1 from public.selections_noms_rapproches r
      where r.cle = s.cle and r.profile_id = p.id);
$$;

create index if not exists profiles_cle_triee_complet
  on public.profiles ((public.cle_triee(full_name)));
