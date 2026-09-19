-- =====================================================================
-- Reprise des profils de l'ancienne plateforme (WFG v1, MySQL).
--
-- Les comptes de l'ancien site ne peuvent pas être recréés tels quels :
-- les mots de passe y sont chiffrés dans un format que Supabase Auth ne
-- sait pas relire. Plutôt que de fabriquer à la main des comptes dans
-- auth.users — l'endroit où une erreur casserait la connexion de tout le
-- monde — on dépose ces profils dans une table à part.
--
-- Cycle de vie d'un profil repris :
--   1. importé ici, sans compte de connexion associé ;
--   2. visible dans l'annuaire des membres connectés (vue ci-dessous) ;
--   3. la personne demande un lien magique avec son ancienne adresse ;
--   4. l'inscription normale crée son vrai profil, puis l'application
--      appelle reclamer_profil_ancienne_plateforme() qui recopie les
--      données et marque la ligne comme réclamée.
--
-- La table contient des emails : aucune policy de lecture n'est posée
-- dessus, tout passe par les vues et la fonction ci-dessous.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Lien durable ancien numéro de compte -> profil actuel.
--    Servira aussi à la reprise des ~10 000 projets.
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists legacy_user_id integer;

create unique index if not exists profiles_legacy_user_id_key
  on public.profiles (legacy_user_id)
  where legacy_user_id is not null;


-- ---------------------------------------------------------------------
-- 2. Les profils repris, tant que personne ne les a réclamés.
-- ---------------------------------------------------------------------
create table if not exists public.legacy_profiles (
  legacy_user_id        integer primary key,
  email                 text not null,
  full_name             text not null,
  category              public.profile_category,
  role_slug             text references public.roles(slug),
  city                  text,
  country               text,
  biofilmo              text,
  testimonial           text,
  testimonial_is_public boolean not null default false,
  claimed_by            uuid references public.profiles(id) on delete set null,
  claimed_at            timestamptz,
  imported_at           timestamptz not null default now()
);

create unique index if not exists legacy_profiles_email_key
  on public.legacy_profiles (lower(email));

alter table public.legacy_profiles enable row level security;

-- Volontairement aucune policy : la table reste inaccessible aux rôles
-- anon et authenticated. Les vues (propriétaire postgres) et la fonction
-- security definer sont les seuls accès.


-- ---------------------------------------------------------------------
-- 3. Annuaire : réservé aux membres connectés, sans les emails.
-- ---------------------------------------------------------------------
create or replace view public.annuaire_ancienne_plateforme as
select
  legacy_user_id,
  full_name,
  category,
  role_slug,
  city,
  country,
  biofilmo
from public.legacy_profiles
where claimed_by is null;

revoke all on public.annuaire_ancienne_plateforme from anon;
grant select on public.annuaire_ancienne_plateforme to authenticated;


-- ---------------------------------------------------------------------
-- 4. Témoignages publics : ceux des membres actuels + ceux repris de
--    l'ancienne plateforme et pas encore réclamés.
--    (drop puis create : le type de la colonne id change.)
-- ---------------------------------------------------------------------
drop view if exists public.temoignages_publics;

create view public.temoignages_publics as
select
  p.id::text                                as id,
  coalesce(p.display_name, p.full_name)     as nom,
  p.avatar_url                              as avatar_url,
  p.testimonial                             as testimonial
from public.profiles p
where p.testimonial_is_public = true
  and p.testimonial is not null
  and btrim(p.testimonial) <> ''
union all
select
  'ancien-' || l.legacy_user_id::text,
  l.full_name,
  null::text,
  l.testimonial
from public.legacy_profiles l
where l.claimed_by is null
  and l.testimonial_is_public = true
  and l.testimonial is not null
  and btrim(l.testimonial) <> '';

grant select on public.temoignages_publics to anon, authenticated;


-- ---------------------------------------------------------------------
-- 5. Réclamation : appelée par l'application une fois la personne
--    connectée. Recopie les données de l'ancien profil vers le nouveau,
--    puis marque la ligne comme réclamée. Sans effet si l'adresse ne
--    correspond à aucun profil repris disponible.
-- ---------------------------------------------------------------------
create or replace function public.reclamer_profil_ancienne_plateforme()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_leg   public.legacy_profiles;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    return false;
  end if;

  select * into v_leg
  from public.legacy_profiles
  where lower(email) = lower(v_email)
    and claimed_by is null
  for update;

  if not found then
    return false;
  end if;

  -- coalesce partout : ce que la personne a déjà saisi sur le nouveau
  -- site prime toujours sur la reprise.
  update public.profiles
  set city           = coalesce(city, v_leg.city),
      country        = coalesce(country, v_leg.country),
      biofilmo       = coalesce(biofilmo, v_leg.biofilmo),
      testimonial    = coalesce(testimonial, v_leg.testimonial),
      testimonial_is_public = case
        when testimonial is null then v_leg.testimonial_is_public
        else testimonial_is_public
      end,
      legacy_user_id = coalesce(legacy_user_id, v_leg.legacy_user_id),
      updated_at     = now()
  where id = auth.uid();

  if v_leg.role_slug is not null then
    insert into public.profile_roles (profile_id, role_slug)
    values (auth.uid(), v_leg.role_slug)
    on conflict do nothing;
  end if;

  update public.legacy_profiles
  set claimed_by = auth.uid(),
      claimed_at = now()
  where legacy_user_id = v_leg.legacy_user_id;

  return true;
end;
$$;

grant execute on function public.reclamer_profil_ancienne_plateforme() to authenticated;
