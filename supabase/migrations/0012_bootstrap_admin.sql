-- =====================================================================
-- Amorçage du premier administrateur.
-- La table public.admins n'ayant aucune policy RLS (personne ne peut s'y
-- promouvoir depuis l'application), l'attribution initiale passe soit par
-- le SQL Editor du dashboard, soit par une migration comme celle-ci.
--
-- Les deux instructions utilisent un SELECT plutôt qu'un VALUES : sur une
-- base vierge (environnement de test, nouvelle instance), elles ne font
-- simplement rien au lieu d'échouer sur la contrainte de clé étrangère.
-- =====================================================================

insert into public.admins (profile_id)
select id from public.profiles where id = '35b5ae3e-e678-4743-a9c4-39a291fdc612'
on conflict (profile_id) do nothing;

-- Ce profil a été créé avant l'introduction des catégories A/P/T.
update public.profiles
set category = 'auteur'
where id = '35b5ae3e-e678-4743-a9c4-39a291fdc612'
  and category is null;
