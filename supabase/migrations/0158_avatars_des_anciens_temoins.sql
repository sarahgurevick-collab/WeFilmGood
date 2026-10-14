-- Les photos de profil des anciens membres de WFG 1 non encore réclamés
-- (14/10/2026, Sarah : il manquait les photos sur la sphère des
-- témoignages). La colonne avatar_url sur legacy_profiles reçoit l'adresse
-- de la photo déposée dans le bucket avatars (script
-- importer-avatars-anciens-temoins.mjs) ; la vue des témoignages la lit ;
-- la réclamation du profil la reprend si la personne n'en a pas déjà une.
alter table public.legacy_profiles add column if not exists avatar_url text;

create or replace view public.temoignages_publics as
select
  p.id::text                                as id,
  coalesce(p.display_name, p.full_name)     as nom,
  p.avatar_url                              as avatar_url,
  p.testimonial                             as testimonial,
  p.category::text                          as categorie
from public.profiles p
where p.testimonial_is_public = true
  and p.testimonial is not null
  and btrim(p.testimonial) <> ''
union all
select
  'ancien-' || l.legacy_user_id::text,
  l.full_name,
  l.avatar_url,
  l.testimonial,
  l.category::text
from public.legacy_profiles l
where l.claimed_by is null
  and l.testimonial_is_public = true
  and l.testimonial is not null
  and btrim(l.testimonial) <> '';

grant select on public.temoignages_publics to anon, authenticated;

CREATE OR REPLACE FUNCTION public.reclamer_profil_ancienne_plateforme()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      avatar_url     = coalesce(avatar_url, v_leg.avatar_url),
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
$function$;
