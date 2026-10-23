-- FFFMED supprimée (23/10/2026, Sarah). Elle était posée sur 3 projets :
-- Akatewa, CERVEAU-DIRECT, El Barrio gitano. Aucun n'avait d'autre sélection
-- ni de prix écrit : leur badge « Primé » (posé par 0133) est retiré aussi.
update public.projects p
   set has_awards = false
 where has_awards
   and coalesce(btrim(p.awards_detail), '') = ''
   and exists (select 1 from public.project_selections s where s.project_id = p.id and s.libelle = 'FFFMED')
   and not exists (select 1 from public.project_selections s where s.project_id = p.id and s.libelle <> 'FFFMED');
delete from public.project_selections where libelle = 'FFFMED';
