-- =====================================================================
-- Les formules des nouveaux paliers (22/09/2026) : 5, 50 et 500 €, un
-- an chacune, payées en ligne par HelloAsso.
--
-- Les formules Dépôt/Accès (0042) restent en base : les adhésions déjà
-- activées à la main y renvoient. Le 5 € est créé mais inactif tant que
-- son contenu n'est pas arrêté.
-- =====================================================================

insert into public.membership_plans
  (slug, label, price_cents, currency, applies_to, description,
   included_project_unlocks, included_free_readings, is_active)
values
  ('palier_5', 'Adhésion 5 €', 500, 'EUR', null, 'Contenu à venir.', 0, 0, false),
  ('palier_50', 'Adhésion 50 €', 5000, 'EUR', null,
   'Chaque semaine : le dépôt d''un projet ou cinq crédits recherche. Dix fiches projets.', 0, 0, true),
  ('palier_500', 'Adhésion 500 €', 50000, 'EUR', null,
   'Onze dépôts, fiches projets illimitées, accompagnement vidéopitch, cinq projets par semaine, un rendez-vous.', 0, 11, true)
on conflict (slug) do nothing;
