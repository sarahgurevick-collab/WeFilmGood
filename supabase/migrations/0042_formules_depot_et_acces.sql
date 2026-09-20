-- =====================================================================
-- Quatre formules : Dépôt et Accès, à 50 € et à 500 €.
--
-- L'auteur paie pour DÉPOSER, le producteur ou le talent pour ACCÉDER.
-- Chacun des deux a sa version à 50 € et à 500 €, comme sur l'ancienne
-- plateforme — le contenu exact des paliers à 500 € reste à préciser.
--
-- L'« Accompagnement sur mesure » mélangeait les deux publics dans une
-- seule ligne à 500 € : il est retiré au profit de la distinction.
-- =====================================================================

update public.membership_plans
set slug = 'depot_50', label = 'Dépôt — 50 €', applies_to = 'auteur',
    description = 'Analyse gratuite d''un document PDF et accès à la Pitchothèque (videopitch et contacts non accessibles).'
where slug = 'adhesion_auteur_50';

update public.membership_plans
set slug = 'acces_50', label = 'Accès — 50 €', applies_to = null,
    description = 'Accès à la Pitchothèque et 5 projets gratuits à trouver par mots-clés, avec videopitch et contact débloqués pour ces projets.'
where slug = 'adhesion_pt_50';

insert into public.membership_plans
  (slug, label, price_cents, currency, applies_to, description,
   included_project_unlocks, included_free_readings, is_active)
values
  ('depot_500', 'Dépôt — 500 €', 50000, 'EUR', 'auteur',
   'Formule étendue pour les auteurs. Contenu à préciser.', 0, 11, true),
  ('acces_500', 'Accès — 500 €', 50000, 'EUR', null,
   'Formule étendue pour les producteurs et les talents. Contenu à préciser.', 25, 0, true)
on conflict (slug) do nothing;

-- Remplacée par les deux formules ci-dessus.
update public.membership_plans set is_active = false where slug = 'accompagnement_500';
