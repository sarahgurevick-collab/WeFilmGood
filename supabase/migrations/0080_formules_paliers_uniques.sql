-- Décision de Sarah (26/09/2026) : les paliers uniques (50 €, 500 €)
-- remplacent le découpage Dépôt/Accès de WFG 1. Les anciennes formules
-- restent en base pour les adhésions qui les portent, mais ne sont plus
-- proposées (ni sur la page Adhésion, ni dans le menu « offrir » de
-- l'administration). Le « palier 5 € » n'est pas une adhésion mais un
-- achat à l'unité (à construire ailleurs) : il quitte la liste des
-- formules s'il n'est porté par aucune adhésion.
update public.membership_plans
   set is_active = false
 where slug in ('depot_50', 'acces_50', 'depot_500', 'acces_500', 'accompagnement_500');

delete from public.membership_plans
 where slug = 'palier_5'
   and not exists (select 1 from public.memberships m where m.plan_slug = 'palier_5');
