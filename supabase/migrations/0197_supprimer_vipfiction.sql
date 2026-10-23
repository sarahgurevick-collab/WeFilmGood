-- Vipfiction supprimée complètement (23/10/2026, Sarah). Elle était posée sur
-- 6 projets : Un bateau dans le ciel, CERVEAU-DIRECT, Le vent souffle où il
-- veut, Elementaria, Akatewa, Les Couleurs des ombres.
-- Le code garde de quoi ne jamais l'afficher si la réimportation de WFG 1
-- la ramenait (LibelleSelection.tsx, 0196).
delete from public.project_selections where libelle = 'Vipfiction';
