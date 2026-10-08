-- « Demander ma validation » (08/10/2026) : option B de Sarah pour les talents
-- repris de WFG 1 qui n'ont pas été validés (producteurs, réalisateurs…).
-- Pas de réinscription : depuis son profil, le talent demande sa validation
-- (sa référence professionnelle est son site), et Sarah valide comme pour un
-- nouvel inscrit.

-- 1. Une faille, vue en préparant le bouton : tout membre connecté pouvait
--    modifier lui-même son statut de validation (validation_status) par
--    l'API. Seules les fonctions de la base et l'administration le peuvent.
create or replace function public.proteger_validation()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.validation_status is distinct from old.validation_status
          or new.validated_at is distinct from old.validated_at
          or new.validated_by is distinct from old.validated_by) then
    raise exception 'La validation est réservée à l''administration';
  end if;
  return new;
end;
$$;
drop trigger if exists proteger_validation on public.profiles;
create trigger proteger_validation before update on public.profiles
  for each row execute function public.proteger_validation();

-- 2. Qui peut demander : un professionnel non validé (premier métier de
--    producteur, réalisateur, comédien… ; ni auteur, ni lecteur).
create or replace function public.peut_demander_validation(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid
      and p.validation_status::text = 'non_requise'
      and coalesce(p.category::text, '') <> 'auteur'
      and not exists (select 1 from public.profile_roles r where r.profile_id = p.id and r.role_slug = 'lecteur')
      and (
        p.category::text in ('producteur', 'talent')
        or exists (select 1 from public.profile_roles r where r.profile_id = p.id
                   and r.role_slug in ('producteur','realisateur','compositeur','comedien','sound_designer','monteur','directeur_photo','chef_decorateur','sfx_digitaux','animateur_2d_3d'))
        or exists (select 1 from public.wfg1_metiers_membres m where m.profile_id = p.id and m.rang = 0
                   and m.slug in ('producteur','realisateur','compositeur','comedien','sound_designer','monteur','directeur_photo','chef_decorateur','sfx_digitaux','animateur_2d_3d'))
      )
  );
$$;

-- 3. La demande : le profil passe « en attente », à condition d'avoir
--    indiqué sa référence professionnelle.
create or replace function public.demander_validation()
returns text language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  if not public.peut_demander_validation(auth.uid()) then return 'refusee'; end if;
  if coalesce(btrim((select website from public.profiles where id = auth.uid())), '') = '' then
    return 'reference_manquante';
  end if;
  update public.profiles set validation_status = 'en_attente', updated_at = now() where id = auth.uid();
  return 'ok';
end;
$$;
grant execute on function public.peut_demander_validation(uuid), public.demander_validation() to authenticated;
