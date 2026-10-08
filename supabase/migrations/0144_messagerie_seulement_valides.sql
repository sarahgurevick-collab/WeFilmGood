-- La fermeture de la messagerie (0143) ne concerne que les producteurs et
-- comédiens VALIDÉS par l'administration (08/10/2026, Sarah) : un métier
-- coché en second choix est secondaire, non vérifié, sans restriction.
-- Le métier principal : la catégorie « producteur » du profil, ou le
-- premier métier (rang 0) repris de WFG 1, ou un métier choisi sur WFG 2.
create or replace function public.messagerie_surveillee(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = uid and validation_status::text = 'validee')
     and (
       exists (select 1 from public.profiles where id = uid and category::text = 'producteur')
       or exists (select 1 from public.profile_roles where profile_id = uid and role_slug in ('producteur', 'comedien'))
       or exists (select 1 from public.wfg1_metiers_membres where profile_id = uid and rang = 0 and slug in ('producteur', 'comedien'))
     );
$$;
