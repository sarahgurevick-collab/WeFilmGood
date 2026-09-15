-- =====================================================================
-- Deux portes de sortie, et plus aucune suppression en cascade.
--
-- Jusqu'ici, supprimer un compte supprimait le profil, qui supprimait
-- ses projets, leurs fichiers, leurs vidéopitchs et les fiches de
-- lecture associées. Un auteur pouvait donc à lui seul effacer du
-- catalogue un projet qui intéresse un producteur.
--
-- Le profil devient une fiche d'identité indépendante du compte de
-- connexion :
--   - Porte 1, le départ : plus d'accès, profil retiré de l'annuaire,
--     mais projets, fiches et coordonnées de contact conservés. C'est
--     réversible — on rattache un nouveau compte au même profil.
--   - Porte 2, l'effacement : les données personnelles sont vidées, le
--     projet reste sous un auteur anonyme. Définitif.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Le profil survit à la suppression du compte de connexion.
--    L'identifiant reste le même : toutes les règles de sécurité du
--    type « auth.uid() = profile_id » continuent de fonctionner à
--    l'identique pour les personnes connectées.
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_id_fkey;


-- ---------------------------------------------------------------------
-- 2. Un projet ne peut plus être emporté par la suppression d'un profil.
--    « restrict » plutôt que « cascade » : la base refuse et oblige à
--    traiter les projets explicitement, au lieu de les détruire en
--    silence.
-- ---------------------------------------------------------------------
alter table public.projects drop constraint if exists projects_owner_id_fkey;
alter table public.projects add constraint projects_owner_id_fkey
  foreign key (owner_id) references public.profiles(id) on delete restrict;


-- ---------------------------------------------------------------------
-- 3. Mémoire du départ : qui, quand, et pourquoi si la personne veut
--    bien le dire. C'est la seule façon de le savoir : le motif ne se
--    reconstitue jamais après coup.
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists departed_at timestamptz;
alter table public.profiles add column if not exists departure_reason text;
alter table public.profiles add column if not exists anonymized_at timestamptz;


-- ---------------------------------------------------------------------
-- 4. Porte 1 — le départ. Accessible à la personne elle-même comme à
--    l'administrateur.
-- ---------------------------------------------------------------------
create or replace function public.mark_profile_departed(
  p_profile_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() <> p_profile_id and not public.is_admin() then
    raise exception 'Seul le titulaire du profil ou un administrateur peut le faire';
  end if;

  update public.profiles
  set departed_at = coalesce(departed_at, now()),
      departure_reason = coalesce(p_reason, departure_reason)
  where id = p_profile_id;
end;
$$;

grant execute on function public.mark_profile_departed(uuid, text) to authenticated;


-- ---------------------------------------------------------------------
-- 5. Porte 2 — l'effacement. Réservé à l'administrateur, qui l'exécute
--    sur demande explicite : on efface la personne, pas l'œuvre.
--    Le projet et les fiches de lecture restent, sous un auteur anonyme.
-- ---------------------------------------------------------------------
create or replace function public.admin_anonymize_profile(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;

  update public.profiles
  set full_name = 'Profil effacé',
      display_name = null,
      bio = null,
      biofilmo = null,
      agent_name = null,
      website = null,
      avatar_url = null,
      city = null,
      country = null,
      testimonial = null,
      testimonial_is_public = false,
      personality_answers = '{}'::jsonb,
      departed_at = coalesce(departed_at, now()),
      anonymized_at = now()
  where id = p_profile_id;

  delete from public.profile_private_details where profile_id = p_profile_id;
  delete from public.profile_contact_info   where profile_id = p_profile_id;
  delete from public.profile_social_links   where profile_id = p_profile_id;
  delete from public.profile_festivals      where profile_id = p_profile_id;
  delete from public.profile_languages      where profile_id = p_profile_id;
  delete from public.profile_genres         where profile_id = p_profile_id;
  delete from public.profile_roles          where profile_id = p_profile_id;
end;
$$;

grant execute on function public.admin_anonymize_profile(uuid) to authenticated;
