-- =====================================================================
-- Droits administrateur pour le compte recréé après la perte du mot de
-- passe du compte initial. Même précaution qu'en 0012 : un SELECT plutôt
-- qu'un VALUES, pour rester sans effet sur une base qui n'a pas ce profil.
-- =====================================================================

insert into public.admins (profile_id)
select id from public.profiles where id = '80c01ad6-6433-4769-919e-ad36f3e8e349'
on conflict (profile_id) do nothing;
