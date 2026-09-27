-- Un court métrage n'a ni budget ni audience sur WFG 2 (27/09/2026,
-- Sarah) : fait pour les festivals, sans modèle économique. On vide ce
-- que la reprise de WFG 1 y avait mis, pour qu'ils ne remontent pas dans
-- les filtres « Budget estimé » et « Audience ciblée » de la recherche.
update public.projects
   set budget_range = null, target_audience = null
 where format = 'court_metrage'
   and (budget_range is not null or target_audience is not null);
