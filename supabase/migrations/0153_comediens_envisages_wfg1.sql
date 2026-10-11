-- Les comédiens envisagés de WFG 1 (11/10/2026, Sarah) : la famille de
-- mots-clés « Acteurs / Actrices » (catégorie 8), posée par les auteurs sur
-- leurs projets (champs keywords et character_keywords de wfg1.projects).
-- Seuls 20 liens sur 110 avaient été repris : on ajoute les manquants, sans
-- rien écraser. À rejouer sur la copie finale au moment de la bascule.
insert into public.project_actors (project_id, libelle)
select distinct pr.id, w.fr
from wfg1.projects p
cross join lateral unnest(string_to_array(coalesce(p.keywords, '') || '|' || coalesce(p.character_keywords, ''), '|')) as t(tok)
join wfg1.keywords w on w.category = 8 and ('8-' || w.keyword) = t.tok
join public.projects pr on pr.legacy_id::text = p.project_id::text
where not exists (select 1 from public.project_actors a where a.project_id = pr.id and a.libelle = w.fr);
