-- Les auteurs sélectionnés reliés à la plateforme (22/10/2026, décision
-- de Sarah : « on peut avoir le 1 et le 2 en même temps ? » — oui).
--
-- Les listes de « Notre histoire » (src/data/selections*.ts) disent
-- « Titre - Auteur - Pays » en texte simple, hérité de l'ancien site. À
-- chaque affichage, la page demande à la base quelles lignes correspondent
-- à une fiche projet et à un membre de WeFilmGood 2 : le titre devient un
-- lien vers la fiche, le nom vers le profil. Rapprochement à l'affichage,
-- jamais figé : les fiches que Sarah créera pour les projets d'avant 2016
-- (WFG 1 naît en 2016) seront reliées d'elles-mêmes.
--
-- Règles : une clé sans accents, sans ponctuation ni casse ; un membre
-- n'est relié que s'il est seul à porter ce nom (pas d'homonyme non
-- départagé), validé ou sans validation requise, ni parti ni anonymisé ;
-- une fiche n'est reliée que si elle est visible des membres et non
-- masquée, d'abord par titre + porteur = l'auteur, sinon par titre seul
-- s'il est unique. Ne renvoie que des identifiants.

create or replace function public.cle_rapprochement(texte text)
returns text
language sql
immutable
parallel safe
set search_path = public
as $$
  select btrim(
    regexp_replace(
      lower(public.unaccent(coalesce(texte, ''))),
      '[^a-z0-9]+', ' ', 'g'
    )
  );
$$;

comment on function public.cle_rapprochement(text) is
  'Clé de comparaison : minuscules, sans accents, sans ponctuation (« Les Forteresses de sable ! » → « les forteresses de sable »).';

create or replace function public.rapprocher_selections(lignes jsonb)
returns table (idx int, project_id uuid, profile_id uuid)
language sql
stable
security definer
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
  m as (
    select l.idx, (array_agg(distinct membres.id))[1] as profile_id
    from l join membres on membres.cle = l.ca
    where l.ca <> ''
    group by l.idx
    having count(distinct membres.id) = 1
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

comment on function public.rapprocher_selections(jsonb) is
  'Pour des lignes [{titre, auteur}], les fiches et profils de WeFilmGood 2 qui leur correspondent (identifiants seuls).';

-- Réservé aux membres connectés : rien n'est visible sans compte.
revoke all on function public.rapprocher_selections(jsonb) from public, anon;
grant execute on function public.rapprocher_selections(jsonb) to authenticated, service_role;
grant execute on function public.cle_rapprochement(text) to anon, authenticated, service_role;
